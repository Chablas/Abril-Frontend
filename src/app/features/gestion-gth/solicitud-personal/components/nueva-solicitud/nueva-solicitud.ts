import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';

/**
 * Tope del sustento, el mismo que valida el backend (`MaxSustentoBytes`). El archivo no viaja
 * adjunto en ningún correo —se sube a SharePoint y los correos llevan su enlace—, así que el
 * límite es nuestro y no el del proveedor de correo.
 */
const MAX_SUSTENTO_BYTES = 20 * 1024 * 1024;

/**
 * Formatos del sustento, los mismos que valida el backend (`AllowedSustentoExt`). Las imágenes
 * entran porque lo que motiva la vacante suele llegar como foto o captura y no como archivo de
 * oficina. Ojo con `.heic`: es el formato por defecto de las fotos de iPhone y NO está
 * permitido, así que ese caso lo tiene que atajar el aviso de abajo.
 */
const SUSTENTO_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { DestinatarioSolicitud } from '../../../shared/dtos/destinatarios.dto';
import {
  largoDocumento,
  ReclutamientoFormDataDto,
  SolicitudPersonalCreateDto,
  TIPO_DOCUMENTO_DNI,
  TIPO_REQUERIMIENTO_REEMPLAZO,
  VacanteCreateDto,
} from '../../dtos/solicitud-personal.dto';

/** Estado en memoria de una vacante del formulario. */
interface VacanteForm {
  /** Puesto del catálogo: el único origen posible (los puestos nuevos los da de alta GTH). */
  puestoId: number | null;
  tipoRequerimientoId: number | null;
  /**
   * Trabajador al que reemplaza la vacante. Solo se pide (y solo se envía) cuando el tipo de
   * requerimiento elegido es Reemplazo; al cambiar a otro tipo se limpia.
   */
  reemplazaWorkerId: number | null;
  projectId: number | null;
  /**
   * Salario bruto mensual de la vacante, en soles. Solo se pide en las vacantes NUEVAS: en un
   * reemplazo el puesto ya existe con su banda, así que el campo ni se muestra y se limpia al
   * cambiar de tipo.
   */
  salarioBrutoMensual: number | null;
  /**
   * Ingreso directo FFT: el solicitante ya sabe a quién quiere. Al marcarlo aparecen (y se exigen)
   * el nombre, el documento y el correo personal del candidato; al desmarcarlo se limpian.
   */
  esFft: boolean;
  fftCandidatoNombre: string;
  /** Tipo de documento del candidato (DNI por defecto): decide cuántos dígitos admite el número. */
  fftTipoDocumentoId: number | null;
  /** Documento del candidato: con él entra a la base maestra de personas al registrarse la solicitud. */
  fftCandidatoDocumento: string;
  fftCandidatoCorreo: string;
}

/**
 * Un aviso de correo del pie del modal: a quién le llega lo que se está por registrar y con qué
 * palabras se dice. Sale uno por cada clase de vacante cargada (nuevas, reemplazos e ingresos
 * directos), más los informativos de las que avisan a alguien que no firma nada.
 */
interface AvisoCorreo {
  /** Identidad del aviso para el `trackBy` (los avisos aparecen y desaparecen al escribir). */
  clave: string;
  /**
   * true = nadie tiene que hacer nada con ese correo (se le avisa al gerente del área de una
   * vacante nueva, se anuncia el turno siguiente de un reemplazo). Van en gris para que no
   * compitan con el correo que sí pide una firma, y no se muestran si no hay a quién mandarlos.
   */
  informativo: boolean;
  /** Lo que abre la frase: «Esta solicitud será notificada a». */
  encabezado: string;
  /** Lo que la cierra, después de los correos: «para su aprobación.». */
  cierre: string;
  para: DestinatarioSolicitud[];
  copias: DestinatarioSolicitud[];
  /**
   * Advertencia para cuando ese correo no le llega a nadie. null en los informativos, que en ese
   * caso no se muestran: lo que hay que avisar es que una firma se va a quedar sin pedir, no que
   * un aviso de cortesía no salga.
   */
  sinDestinatarios: string | null;
}

@Component({
  standalone: true,
  selector: 'app-gth-nueva-solicitud',
  imports: [BaseModal, CommonModule, FormsModule, SearchSelect, FileSelector, TitleCasePipe],
  templateUrl: './nueva-solicitud.html',
})
export class GthNuevaSolicitud implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  /** Tope de la justificación; el backend rechaza cualquier cosa más larga. */
  readonly maxJustificacion = 4000;

  /**
   * Tope del salario bruto mensual, igual al del backend: ataja el dedazo de escribir el sueldo
   * con los céntimos pegados (3500 00 → 350000) antes de que salga la petición.
   */
  readonly maxSalario = 1_000_000;

  /** Tope del nombre del candidato FFT, igual que en el backend. */
  readonly maxFftNombre = 200;


  /**
   * Correo válido para el candidato FFT. Misma expresión que valida el backend (y que la del envío
   * del formulario al postulante): es el mismo buzón, así que lo que se acepta acá tiene que ser
   * exactamente lo que después se pueda usar para escribirle.
   */
  private readonly correoValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  formData: ReclutamientoFormDataDto = {
    areaNombre: null,
    areaScopeId: null,
    puestoNombre: null,
    categoriaNombre: null,
    maxVacantes: 10,
    puestos: [],
    tiposRequerimiento: [],
    proyectos: [],
    // Arranca en false: hasta que llegue la respuesta el formulario no ofrece la casilla de
    // ingreso directo, que después el backend podría rechazar.
    puedePedirIngresoDirecto: false,
    tiposDocumento: [],
    trabajadoresArea: [],
    destinatariosNuevas: { para: [], copias: [] },
    destinatariosNuevasAviso: { para: [], copias: [] },
    destinatariosReemplazos: { para: [], copias: [] },
    destinatariosReemplazosGth: { para: [], copias: [] },
    destinatariosFft: null,
  };

  /** El aviso de destinatarios solo se muestra cuando ya se sabe a quién le llega (o a nadie). */
  destinatariosCargados = false;

  /** Opciones del desplegable "Cantidad total de vacantes" (1..maxVacantes). */
  cantidadOptions: { id: number; nombre: string }[] = [];
  cantidad = 1;

  vacantes: VacanteForm[] = [];
  justificacion = '';
  sustento: SelectedFile | null = null;
  readonly sustentoAccept = SUSTENTO_ACCEPT;

  submitted = false;

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.vacantes = [this.nuevaVacante()];
    setTimeout(() => this.loadFormData());
  }

  loadFormData(): void {
    this.loaderService.show();
    this.service.getFormData().subscribe({
      next: (data) => {
        this.formData = {
          ...data,
          puedePedirIngresoDirecto: data.puedePedirIngresoDirecto ?? false,
          tiposDocumento: data.tiposDocumento ?? [],
          trabajadoresArea: data.trabajadoresArea ?? [],
          destinatariosNuevas: data.destinatariosNuevas ?? { para: [], copias: [] },
          destinatariosNuevasAviso: data.destinatariosNuevasAviso ?? { para: [], copias: [] },
          destinatariosReemplazos: data.destinatariosReemplazos ?? { para: [], copias: [] },
          destinatariosReemplazosGth: data.destinatariosReemplazosGth ?? { para: [], copias: [] },
          destinatariosFft: data.destinatariosFft ?? null,
        };
        this.destinatariosCargados = true;
        // El tipo de documento arranca en DNI, que es el caso normal; queda cambiarlo solo cuando
        // el candidato es extranjero. Se aplica a los bloques que ya existen y a los que se
        // agreguen después (ver nuevaVacante).
        for (const v of this.vacantes) v.fftTipoDocumentoId ??= this.tipoDocumentoPorDefecto;
        const max = data.maxVacantes || 10;
        this.cantidadOptions = Array.from({ length: max }, (_, i) => ({
          id: i + 1,
          nombre: String(i + 1).padStart(2, '0'),
        }));
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── FFT: quién puede pedir un ingreso directo ──────────────────────
  /**
   * ¿Se le ofrece la casilla FFT? Solo a GTH, el área dueña del proceso: un ingreso directo se
   * salta la aprobación, la publicación y la selección entera. Lo decide el backend por el área de
   * su ficha, no el rol, y es él quien rechaza una vacante marcada por cualquier otro.
   */
  get puedePedirIngresoDirecto(): boolean {
    return this.formData.puedePedirIngresoDirecto;
  }

  // ── Aviso "a quién le llega esta solicitud" ────────────────────────
  // No hay un destinatario único: cada vacante sale por la ruta de su tipo y cada ruta tiene su
  // propio correo. Las tres clases y sus reglas son las mismas que aplica el backend al enviar
  // (ver RutaAprobacion): si acá dijeran otra cosa, el aviso prometería correos distintos de los
  // que salen.

  /**
   * ¿Es un ingreso directo? A un FFT no lo aprueba nadie, así que su aviso va derecho a GTH y con
   * otros destinatarios. Sin la casilla habilitada no hay ingreso directo posible.
   */
  private esIngresoDirecto(v: VacanteForm): boolean {
    return this.puedePedirIngresoDirecto && v.esFft;
  }

  /**
   * ¿Es una vacante NUEVA, de las que firma Gerencia General? Mientras no se haya elegido el tipo
   * no es de ninguna clase: la vacante todavía no tiene ruta y prometer un correo por ella sería
   * adivinar. Cualquier otro tipo que no sea Reemplazo va por Gerencia General, igual que en el
   * backend.
   */
  private esNueva(v: VacanteForm): boolean {
    return !this.esIngresoDirecto(v) && v.tipoRequerimientoId !== null && !this.esReemplazo(v);
  }

  /** ¿Es un reemplazo, de los que firman el gerente del área y después GTH? */
  private esReemplazoPorAprobar(v: VacanteForm): boolean {
    return !this.esIngresoDirecto(v) && this.esReemplazo(v);
  }

  get hayIngresoDirecto(): boolean {
    return this.vacantes.some((v) => this.esIngresoDirecto(v));
  }

  get hayVacantesNuevas(): boolean {
    return this.vacantes.some((v) => this.esNueva(v));
  }

  get hayReemplazos(): boolean {
    return this.vacantes.some((v) => this.esReemplazoPorAprobar(v));
  }

  /**
   * Los avisos de correo que corresponden a lo que hay cargado en este momento, en el orden del
   * flujo. Se arman acá y no en la plantilla porque la misma regla que decide CUÁLES se muestran
   * decide cómo se redactan: con una sola clase de vacante la frase puede hablar de «esta
   * solicitud», pero en cuanto hay dos hay que decir de qué vacantes habla cada correo o se
   * leerían como si fueran de todas.
   */
  get avisosCorreo(): AvisoCorreo[] {
    const nuevas = this.hayVacantesNuevas;
    const reemplazos = this.hayReemplazos;
    const fft = this.hayIngresoDirecto;
    const unaSolaClase = [nuevas, reemplazos, fft].filter(Boolean).length === 1;

    const avisos: AvisoCorreo[] = [];

    if (nuevas) {
      avisos.push({
        clave: 'nuevas',
        informativo: false,
        encabezado: unaSolaClase
          ? 'Esta solicitud será notificada a'
          : 'Las vacantes nuevas se notificarán a',
        cierre: 'para su aprobación.',
        para: this.formData.destinatariosNuevas.para,
        copias: this.formData.destinatariosNuevas.copias,
        sinDestinatarios:
          'No hay ningún destinatario para el correo de aprobación de las vacantes nuevas: ' +
          'quedarán registradas pero sin avisarle a nadie. Podrás reenviarlas desde «Mis ' +
          'solicitudes de vacante» cuando se configuren.',
      });

      // Al gerente del área no se le pide nada por una vacante nueva —la firma Gerencia General—
      // pero se le avisa. Si nadie está configurado para recibirlo, ese correo simplemente no
      // sale y no hay nada que anunciar.
      if (this.formData.destinatariosNuevasAviso.para.length) {
        avisos.push({
          clave: 'nuevas-aviso',
          informativo: true,
          encabezado: 'También se le avisará a',
          cierre: 'para su conocimiento.',
          para: this.formData.destinatariosNuevasAviso.para,
          copias: this.formData.destinatariosNuevasAviso.copias,
          sinDestinatarios: null,
        });
      }
    }

    if (reemplazos) {
      avisos.push({
        clave: 'reemplazos',
        informativo: false,
        encabezado: unaSolaClase
          ? 'Esta solicitud será notificada a'
          : 'Los reemplazos se notificarán a',
        cierre: 'para su aprobación.',
        para: this.formData.destinatariosReemplazos.para,
        copias: this.formData.destinatariosReemplazos.copias,
        sinDestinatarios:
          'No hay ningún destinatario para el correo de aprobación de los reemplazos: quedarán ' +
          'registrados pero sin avisarle a nadie. Podrás reenviarlos desde «Mis solicitudes de ' +
          'vacante» cuando se configuren.',
      });

      // Las dos firmas del reemplazo son secuenciales: a GTH no le llega nada hasta que el
      // gerente del área aprueba, así que se nombra como lo que es —el paso siguiente— y no
      // como un correo que sale ahora.
      if (this.formData.destinatariosReemplazosGth.para.length) {
        avisos.push({
          clave: 'reemplazos-gth',
          informativo: true,
          encabezado: 'Cuando el gerente del área apruebe, se le pedirá la aprobación a',
          cierre: 'para continuar.',
          para: this.formData.destinatariosReemplazosGth.para,
          copias: this.formData.destinatariosReemplazosGth.copias,
          sinDestinatarios: null,
        });
      }
    }

    if (fft) {
      avisos.push({
        clave: 'fft',
        informativo: false,
        encabezado: unaSolaClase
          ? 'Esta solicitud será notificada a'
          : 'Los ingresos directos se notificarán a',
        cierre: 'para su EMO.',
        para: this.formData.destinatariosFft?.para ?? [],
        copias: this.formData.destinatariosFft?.copias ?? [],
        sinDestinatarios:
          'No hay ningún destinatario para el aviso de los ingresos directos a Gestión de ' +
          'Talento Humano: quedarán registrados pero sin avisarle a nadie. Igual aparecerán en ' +
          'la bandeja de Reclutamiento.',
      });
    }

    return avisos;
  }

  trackAviso(_: number, aviso: AvisoCorreo): string {
    return aviso.clave;
  }

  /** Tooltip del correo: el nombre de la persona cuando se conoce, más por qué lo recibe. */
  etiquetaDestinatario(d: DestinatarioSolicitud): string {
    return d.nombre ? `${d.nombre} — ${d.origen}` : d.origen;
  }

  private nuevaVacante(): VacanteForm {
    return {
      puestoId: null,
      tipoRequerimientoId: null,
      reemplazaWorkerId: null,
      projectId: null,
      salarioBrutoMensual: null,
      esFft: false,
      fftCandidatoNombre: '',
      fftTipoDocumentoId: this.tipoDocumentoPorDefecto,
      fftCandidatoDocumento: '',
      fftCandidatoCorreo: '',
    };
  }

  // ── Documento del candidato FFT ────────────────────────────────────────
  /** DNI, o el primero del catálogo si algún día deja de existir. Null mientras no haya cargado. */
  private get tipoDocumentoPorDefecto(): number | null {
    const tipos = this.formData.tiposDocumento;
    return (
      tipos.find((t) => t.codigo?.toUpperCase() === TIPO_DOCUMENTO_DNI)?.id ?? tipos[0]?.id ?? null
    );
  }

  /** Código del tipo elegido en esta vacante (`DNI` / `CE`); null si todavía no eligió. */
  private codigoTipoDocumento(v: VacanteForm): string | null {
    return this.formData.tiposDocumento.find((t) => t.id === v.fftTipoDocumentoId)?.codigo ?? null;
  }

  /** Dígitos que admite el documento de esta vacante, según el tipo elegido. */
  largoDocumento(v: VacanteForm): { min: number; max: number } {
    return largoDocumento(this.codigoTipoDocumento(v));
  }

  /**
   * Lo que se le dice al solicitante cuando el largo no cuadra. Se arma del mismo rango que valida
   * `save()` para que el mensaje no pueda contradecir a la regla.
   */
  reglaDocumento(v: VacanteForm): string {
    const { min, max } = this.largoDocumento(v);
    return min === max ? `Debe tener ${min} dígitos` : `Debe tener entre ${min} y ${max} dígitos`;
  }

  /** El mismo rango, en el placeholder del campo: se ve antes de escribir nada. */
  placeholderDocumento(v: VacanteForm): string {
    const { min, max } = this.largoDocumento(v);
    return min === max ? `${min} dígitos` : `${min} a ${max} dígitos`;
  }

  /**
   * Al cambiar el tipo se recorta lo ya escrito al nuevo máximo: pasar de CE (12) a DNI (8) con el
   * número puesto dejaría un valor que el propio campo ya no deja teclear.
   */
  onFftTipoDocumentoChange(v: VacanteForm, tipoId: number | null): void {
    v.fftTipoDocumentoId = tipoId;
    v.fftCandidatoDocumento = v.fftCandidatoDocumento.slice(0, this.largoDocumento(v).max);
  }

  // ── FFT: el candidato ya tiene nombre ──────────────────────────────
  /**
   * Al desmarcar FFT se limpian el nombre, el documento y el correo: si no, quedarían enviándose
   * datos que el usuario ya no ve (y que el backend descartaría igual). El tipo de documento
   * vuelve a su valor por defecto en vez de quedar vacío, para que al remarcar la casilla el campo
   * abra listo.
   */
  onFftChange(v: VacanteForm, esFft: boolean): void {
    v.esFft = esFft;
    if (!esFft) {
      v.fftCandidatoNombre = '';
      v.fftTipoDocumentoId = this.tipoDocumentoPorDefecto;
      v.fftCandidatoDocumento = '';
      v.fftCandidatoCorreo = '';
    }
  }

  /** ¿Falta el nombre del candidato FFT? Misma regla que valida `save()`. */
  fftNombreInvalido(v: VacanteForm): boolean {
    const nombre = v.fftCandidatoNombre.trim();
    return v.esFft && (nombre.length === 0 || nombre.length > this.maxFftNombre);
  }

  /**
   * Filtra lo tecleado en el documento: solo dígitos y como máximo los que admita su tipo, así no
   * se puede pasar de largo. El `maxlength` del input no basta — no ataja el pegado de un número
   * con puntos o espacios, que es la forma más común de copiarlo.
   */
  onFftDocumentoInput(v: VacanteForm, event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '').slice(0, this.largoDocumento(v).max);
    if (input.value !== limpio) input.value = limpio;
    v.fftCandidatoDocumento = limpio;
  }

  /** ¿Falta el tipo de documento del candidato FFT? */
  fftTipoDocumentoInvalido(v: VacanteForm): boolean {
    return v.esFft && !v.fftTipoDocumentoId;
  }

  /** ¿Falta el documento del candidato FFT, o no tiene los dígitos que su tipo exige? */
  fftDocumentoInvalido(v: VacanteForm): boolean {
    if (!v.esFft) return false;
    const { min, max } = this.largoDocumento(v);
    const largo = v.fftCandidatoDocumento.trim().length;
    return largo < min || largo > max;
  }

  /** ¿Falta el correo personal del candidato FFT, o no tiene formato de correo? */
  fftCorreoInvalido(v: VacanteForm): boolean {
    return v.esFft && !this.correoValido.test(v.fftCandidatoCorreo.trim());
  }

  /**
   * ¿El salario de la vacante está sin llenar o fuera de rango? Es la misma regla que valida
   * `save()` y la que decide el mensaje bajo el campo, para que no puedan discrepar. En un
   * reemplazo no se pide: el campo ni se muestra, así que nunca es inválido.
   */
  salarioInvalido(v: VacanteForm): boolean {
    if (!this.pideSalario(v)) return false;
    const s = v.salarioBrutoMensual;
    return s === null || !(s > 0) || s > this.maxSalario;
  }

  /**
   * ¿Esta vacante pide el sueldo? Solo las NUEVAS: en un reemplazo se cubre un puesto que ya
   * existe con su banda, así que declararlo de nuevo no aporta nada a la aprobación. Mientras no
   * se haya elegido el tipo se muestra, para no dejar el bloque incompleto de entrada.
   */
  pideSalario(v: VacanteForm): boolean {
    return !this.esReemplazo(v);
  }

  // ── Reemplazo: a quién se reemplaza ────────────────────────────────
  // ── A dónde entra el contratado ────────────────────────────────────
  /**
   * Área a la que entrará quien ocupe el puesto elegido. Sale del puesto, no del solicitante:
   * la Gerencia Inmobiliaria pide un Ingeniero Residente y el residente entra a Residencia. Por
   * eso el formulario ya no pregunta el área — solo la informa.
   *
   * null cuando no hay puesto elegido o el puesto no tiene destino (los de obra): en ese caso
   * el contratado entra al área del propio solicitante.
   */
  areaDestino(v: VacanteForm): string | null {
    if (!v.puestoId) return null;
    return this.formData.puestos.find((p) => p.id === v.puestoId)?.areaDestino ?? null;
  }

  /** ¿La vacante es un reemplazo? Se decide por el código del catálogo, no por su nombre. */
  esReemplazo(v: VacanteForm): boolean {
    const tipo = this.formData.tiposRequerimiento.find((t) => t.id === v.tipoRequerimientoId);
    return tipo?.codigo === TIPO_REQUERIMIENTO_REEMPLAZO;
  }

  /**
   * Al cambiar el tipo se limpia lo que el otro tipo no usa: el trabajador reemplazado fuera de un
   * reemplazo, y el sueldo dentro de uno. Si no, quedarían enviándose datos que el usuario ya no
   * ve (y que el backend descartaría igual).
   */
  onTipoRequerimientoChange(v: VacanteForm, tipoId: number | null): void {
    v.tipoRequerimientoId = tipoId;
    if (this.esReemplazo(v)) v.salarioBrutoMensual = null;
    else v.reemplazaWorkerId = null;
  }

  /**
   * true cuando el área del solicitante no tiene trabajadores registrados: no hay de dónde elegir,
   * así que el campo se muestra vacío con su aviso y deja de exigirse (el backend hace lo mismo).
   */
  get sinTrabajadoresArea(): boolean {
    return this.formData.trabajadoresArea.length === 0;
  }

  /** Ajusta la cantidad de bloques de vacante conservando los ya completados. */
  onCantidadChange(cantidad: number): void {
    this.cantidad = cantidad;
    if (cantidad > this.vacantes.length) {
      while (this.vacantes.length < cantidad) this.vacantes.push(this.nuevaVacante());
    } else if (cantidad < this.vacantes.length) {
      this.vacantes.length = cantidad;
    }
  }

  // ── Sustento (adjunto único opcional) ──────────────────────────────
  onSustentoSelected(file: SelectedFile): void {
    // El `accept` del input solo filtra el diálogo de archivos: al arrastrar y soltar no se
    // aplica, así que el formato se comprueba acá. Sin esto el archivo se sube completo y recién
    // lo rechaza el backend con un 400, después de que el usuario llenó todo el formulario.
    const ext = '.' + (file.file.name.split('.').pop() ?? '').toLowerCase();
    if (!file.file.name.includes('.') || !SUSTENTO_ACCEPT.split(',').includes(ext)) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato de sustento no permitido',
        text:
          `«${file.file.name}» no es un formato permitido. Adjunta un PDF, DOC, DOCX, XLS, XLSX, ` +
          'JPG, PNG o WEBP.',
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      return;
    }

    // El file-selector no valida tamaño, así que se comprueba acá: sin esto un archivo de más de
    // 20 MB se sube completo y recién lo rechaza el backend, después de la espera de la subida.
    if (file.file.size > MAX_SUSTENTO_BYTES) {
      Swal.fire({
        icon: 'warning',
        title: 'El sustento pesa demasiado',
        text:
          `«${file.file.name}» pesa ${(file.file.size / 1024 / 1024).toFixed(1)} MB y el máximo es ` +
          `${MAX_SUSTENTO_BYTES / 1024 / 1024} MB.`,
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      return;
    }

    this.sustento = file; // reemplaza: solo un sustento por solicitud
  }

  quitarSustento(): void {
    this.sustento = null;
  }

  // ── Validación + envío ─────────────────────────────────────────────
  save(): void {
    this.submitted = true;

    const errors: string[] = [];
    this.vacantes.forEach((v, i) => {
      const pref = `Vacante ${i + 1}`;
      if (!v.puestoId) errors.push(`${pref}: puesto`);
      if (!v.tipoRequerimientoId) errors.push(`${pref}: tipo de requerimiento`);
      if (this.esReemplazo(v) && !this.sinTrabajadoresArea && !v.reemplazaWorkerId)
        errors.push(`${pref}: trabajador al que reemplaza`);
      if (!v.projectId) errors.push(`${pref}: proyecto/obra`);
      if (this.salarioInvalido(v)) errors.push(`${pref}: salario bruto mensual`);
      if (this.fftNombreInvalido(v)) errors.push(`${pref}: nombre completo del candidato (FFT)`);
      if (this.fftTipoDocumentoInvalido(v)) errors.push(`${pref}: tipo de documento del candidato (FFT)`);
      if (this.fftDocumentoInvalido(v))
        errors.push(`${pref}: documento del candidato (FFT) — ${this.reglaDocumento(v).toLowerCase()}`);
      if (this.fftCorreoInvalido(v)) errors.push(`${pref}: correo personal del candidato (FFT)`);
    });

    if (!this.justificacion.trim()) errors.push('Justificación general de la solicitud');

    if (errors.length > 0) {
      Swal.fire({
        title: 'Campos requeridos',
        html: `<ul class="text-left text-sm list-disc pl-4">${errors.map((e) => `<li>${e}</li>`).join('')}</ul>`,
        icon: 'warning',
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      return;
    }

    const payload: SolicitudPersonalCreateDto = {
      justificacion: this.justificacion.trim(),
      vacantes: this.vacantes.map<VacanteCreateDto>((v) => ({
        puestoId: v.puestoId,
        tipoRequerimientoId: v.tipoRequerimientoId,
        reemplazaWorkerId: this.esReemplazo(v) ? v.reemplazaWorkerId : null,
        projectId: v.projectId,
        // En un reemplazo el campo ni se mostró: se manda null explícito en vez de lo que hubiera
        // quedado de un cambio de tipo.
        salarioBrutoMensual: this.pideSalario(v) ? v.salarioBrutoMensual : null,
        // Sin la casilla no hay ingreso directo que enviar: el backend lo rechazaría con un 403.
        esFft: this.puedePedirIngresoDirecto && v.esFft,
        fftCandidatoNombre: v.esFft ? v.fftCandidatoNombre.trim() : null,
        fftTipoDocumentoId: v.esFft ? v.fftTipoDocumentoId : null,
        fftCandidatoDocumento: v.esFft ? v.fftCandidatoDocumento.trim() : null,
        fftCandidatoCorreo: v.esFft ? v.fftCandidatoCorreo.trim() : null,
      })),
    };

    this.loaderService.show();
    this.service.create(payload, this.sustento?.file ?? null).subscribe({
      next: (res) => {
        this.loaderService.hide();
        // El correo al Gerente General es el que arranca el flujo: si no salió hay que avisarlo
        // como advertencia (la solicitud sí quedó registrada y se puede reenviar desde la tabla).
        Swal.fire({
          title: res.correoGerenciaEnviado ? 'Solicitud registrada' : 'Solicitud registrada sin correo',
          text: res.message,
          icon: res.correoGerenciaEnviado ? 'success' : 'warning',
          confirmButtonColor: 'var(--color-abril-standard)',
          draggable: true,
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
