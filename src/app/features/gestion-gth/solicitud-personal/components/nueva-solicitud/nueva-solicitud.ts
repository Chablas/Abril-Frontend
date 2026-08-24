import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { DestinatarioSolicitud, SolicitudDestinatarios } from '../../../shared/dtos/destinatarios.dto';
import {
  ReclutamientoFormDataDto,
  SolicitudPersonalCreateDto,
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
   * Salario bruto mensual de la vacante, en soles. Obligatorio: es lo que aprueban el gerente del
   * área y Gerencia General junto con la vacante.
   */
  salarioBrutoMensual: number | null;
  /**
   * Ingreso directo FFT: el solicitante ya sabe a quién quiere. Al marcarlo aparecen (y se exigen)
   * el nombre y el correo personal del candidato; al desmarcarlo se limpian.
   */
  esFft: boolean;
  fftCandidatoNombre: string;
  fftCandidatoCorreo: string;
}

@Component({
  standalone: true,
  selector: 'app-gth-nueva-solicitud',
  imports: [BaseModal, CommonModule, FormsModule, SearchSelect, FileSelector],
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
    maxVacantes: 10,
    puestos: [],
    tiposRequerimiento: [],
    proyectos: [],
    trabajadoresArea: [],
    destinatarios: { para: [], copias: [] },
    esGerenteGeneral: false,
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
          trabajadoresArea: data.trabajadoresArea ?? [],
          destinatarios: data.destinatarios ?? { para: [], copias: [] },
          esGerenteGeneral: data.esGerenteGeneral ?? false,
          destinatariosFft: data.destinatariosFft ?? null,
        };
        this.destinatariosCargados = true;
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

  // ── Aviso "a quién le llega esta solicitud" ────────────────────────
  /**
   * ¿Esta solicitud se salta la aprobación de Gerencia General? Solo cuando la registra el propio
   * Gerente General y TODAS sus vacantes son FFT: pedirle su firma sobre un candidato que él mismo
   * nombró no aprueba nada. Es la misma regla que aplica el backend — si acá dijera otra cosa, el
   * aviso prometería un correo distinto del que sale.
   */
  get omiteAprobacionGg(): boolean {
    return (
      this.formData.esGerenteGeneral &&
      this.vacantes.length > 0 &&
      this.vacantes.every((v) => v.esFft)
    );
  }

  /** El aviso de destinatarios cambia de correo cuando la solicitud se salta la aprobación. */
  private get destinatariosVigentes(): SolicitudDestinatarios {
    return (
      (this.omiteAprobacionGg ? this.formData.destinatariosFft : this.formData.destinatarios) ?? {
        para: [],
        copias: [],
      }
    );
  }

  get destinatariosPara(): DestinatarioSolicitud[] {
    return this.destinatariosVigentes.para ?? [];
  }

  get destinatariosCopias(): DestinatarioSolicitud[] {
    return this.destinatariosVigentes.copias ?? [];
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
      fftCandidatoCorreo: '',
    };
  }

  // ── FFT: el candidato ya tiene nombre ──────────────────────────────
  /**
   * Al desmarcar FFT se limpian el nombre y el correo: si no, quedarían enviándose datos que el
   * usuario ya no ve (y que el backend descartaría igual).
   */
  onFftChange(v: VacanteForm, esFft: boolean): void {
    v.esFft = esFft;
    if (!esFft) {
      v.fftCandidatoNombre = '';
      v.fftCandidatoCorreo = '';
    }
  }

  /** ¿Falta el nombre del candidato FFT? Misma regla que valida `save()`. */
  fftNombreInvalido(v: VacanteForm): boolean {
    const nombre = v.fftCandidatoNombre.trim();
    return v.esFft && (nombre.length === 0 || nombre.length > this.maxFftNombre);
  }

  /** ¿Falta el correo personal del candidato FFT, o no tiene formato de correo? */
  fftCorreoInvalido(v: VacanteForm): boolean {
    return v.esFft && !this.correoValido.test(v.fftCandidatoCorreo.trim());
  }

  /**
   * ¿El salario de la vacante está sin llenar o fuera de rango? Es la misma regla que valida
   * `save()` y la que decide el mensaje bajo el campo, para que no puedan discrepar.
   */
  salarioInvalido(v: VacanteForm): boolean {
    const s = v.salarioBrutoMensual;
    return s === null || !(s > 0) || s > this.maxSalario;
  }

  // ── Reemplazo: a quién se reemplaza ────────────────────────────────
  /** ¿La vacante es un reemplazo? Se decide por el código del catálogo, no por su nombre. */
  esReemplazo(v: VacanteForm): boolean {
    const tipo = this.formData.tiposRequerimiento.find((t) => t.id === v.tipoRequerimientoId);
    return tipo?.codigo === TIPO_REQUERIMIENTO_REEMPLAZO;
  }

  /**
   * Al dejar de ser un reemplazo se limpia el trabajador elegido: si no, quedaría enviándose un
   * dato que el usuario ya no ve (y que el backend descartaría igual).
   */
  onTipoRequerimientoChange(v: VacanteForm, tipoId: number | null): void {
    v.tipoRequerimientoId = tipoId;
    if (!this.esReemplazo(v)) v.reemplazaWorkerId = null;
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
        salarioBrutoMensual: v.salarioBrutoMensual,
        esFft: v.esFft,
        fftCandidatoNombre: v.esFft ? v.fftCandidatoNombre.trim() : null,
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
