import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../shared/components/date-picker/date-picker';
import { PostulanteFormularioService } from './services/postulante-formulario.service';
import {
  DistritoOpcion,
  OpcionFormulario,
  PostulanteFormularioPublico,
  PostulanteFormularioRespuestas,
  TipoDocumentoOpcion,
  respuestasVacias,
} from './dtos/postulante-formulario.dto';

/**
 * Página PÚBLICA del formulario de información del postulante (acceso por token, sin login).
 * Reemplaza al Microsoft Forms "FORMULARIO POSTULANTE - ABRIL GRUPO INMOBILIARIO". Se llena en
 * 4 pasos (datos personales, estudios, experiencia laboral, consentimiento) y al enviarse queda
 * COMPLETADO a la espera de la revisión de GTH.
 */
@Component({
  standalone: true,
  selector: 'app-postulante-formulario',
  imports: [CommonModule, FormsModule, SearchSelect, DatePicker],
  templateUrl: './postulante-formulario.html',
  styleUrl: './postulante-formulario.css',
})
export class PostulanteFormulario implements OnInit {
  /** Color de acento del formulario (azul del logo de Abril). */
  readonly accent = 'var(--color-abril-logo-blue)';

  token = '';
  cargando = true;
  enviando = false;
  /** true cuando la carga falla o el token no es válido. */
  errorCarga = false;
  mensajeError = '';
  /** true cuando el postulante envió el formulario correctamente (pantalla de agradecimiento). */
  enviado = false;

  data: PostulanteFormularioPublico | null = null;
  model: PostulanteFormularioRespuestas = respuestasVacias();

  /** Universidades ya ordenadas (alfabéticas y "Otras" al final). Se calcula una sola vez al cargar. */
  universidades: OpcionFormulario[] = [];

  /** Largo exacto del número de documento cuando el tipo es DNI (8 dígitos). */
  readonly dniLargo = 8;
  /** Largo máximo del número de celular (9 dígitos). */
  readonly celularLargo = 9;

  paso = 1;
  readonly totalPasos = 4;
  readonly pasosNombres = ['Datos personales', 'Estudios', 'Experiencia laboral', 'Consentimiento'];

  constructor(
    private route: ActivatedRoute,
    private service: PostulanteFormularioService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorCarga = true;
      this.mensajeError = 'El enlace del formulario no es válido.';
      this.cargando = false;
      return;
    }
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    // App zoneless: forzamos el refresco para que el formulario aparezca sin un click extra.
    this.service.getPublico(this.token).subscribe({
      next: (data) => {
        this.data = data;
        this.universidades = this.ordenarUniversidades(data.universidades ?? []);
        this.model = { ...respuestasVacias(), ...data.respuestas };
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError =
          err.error?.message ?? 'No se pudo cargar el formulario. Verifica el enlace e inténtalo de nuevo.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Corrección tras un rechazo de GTH ───────────────────────────────────
  /**
   * Observaciones que dejó GTH al rechazar el formulario. Vienen solo cuando el formulario está
   * RECHAZADO: se muestran en las 4 páginas para que el postulante corrija sobre lo que ya llenó
   * (sus respuestas llegan precargadas) en vez de empezar de cero.
   */
  get observaciones(): string | null {
    return this.data?.observaciones ?? null;
  }

  /** true si el postulante está corrigiendo un formulario observado por GTH. */
  get esCorreccion(): boolean {
    return !!this.observaciones || this.data?.estadoCodigo === 'RECHAZADO';
  }

  // ── Catálogos (atajos para el template) ─────────────────────────────────
  get estadosCiviles(): OpcionFormulario[] { return this.data?.estadosCiviles ?? []; }
  get tiposDocumento(): TipoDocumentoOpcion[] { return this.data?.tiposDocumento ?? []; }
  get distritos(): DistritoOpcion[] { return this.data?.distritos ?? []; }
  get gradosAcademicos(): OpcionFormulario[] { return this.data?.gradosAcademicos ?? []; }
  get disponibilidades(): OpcionFormulario[] { return this.data?.disponibilidades ?? []; }
  get motivosCese(): OpcionFormulario[] { return this.data?.motivosCese ?? []; }

  /**
   * Universidades en orden alfabético con "Otras" siempre al final: es la opción de escape del
   * catálogo, no una universidad más, así que no debe competir por su letra inicial.
   */
  private ordenarUniversidades(lista: OpcionFormulario[]): OpcionFormulario[] {
    const esOtras = (o: OpcionFormulario) => /^otr[ao]s?$/i.test((o.nombre ?? '').trim());
    const otras = lista.filter(esOtras);
    const resto = lista
      .filter((o) => !esOtras(o))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return [...resto, ...otras];
  }

  // ── Número de documento / celular (solo dígitos) ─────────────────────────
  /** true si el tipo de documento elegido es DNI (que son exactamente 8 dígitos numéricos). */
  get esDni(): boolean {
    return this.tiposDocumento.find((t) => t.id === this.model.tipoDocumentoId)?.codigo === 'DNI';
  }

  /** El DNI exige 8 dígitos exactos; para el carné de extranjería basta que esté lleno. */
  get documentoValido(): boolean {
    const valor = (this.model.numeroDocumento ?? '').trim();
    return this.esDni ? /^\d{8}$/.test(valor) : valor.length > 0;
  }

  /**
   * Al cambiar el tipo de documento re-aplica la regla al valor ya escrito (ej. si venía un carné
   * alfanumérico y se pasa a DNI, se queda solo con los primeros 8 dígitos).
   */
  onTipoDocumentoChange(id: number | null): void {
    this.model.tipoDocumentoId = id;
    if (this.esDni) {
      this.model.numeroDocumento = this.soloDigitos(this.model.numeroDocumento, this.dniLargo);
    }
  }

  /** Filtra lo tecleado en el número de documento: si es DNI, solo dígitos y máximo 8. */
  onNumeroDocumentoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = this.esDni ? this.soloDigitos(input.value, this.dniLargo) : input.value;
    if (input.value !== limpio) input.value = limpio;
    this.model.numeroDocumento = limpio;
  }

  /** Filtra lo tecleado en el celular: solo dígitos y máximo 9. */
  onCelularInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = this.soloDigitos(input.value, this.celularLargo);
    if (input.value !== limpio) input.value = limpio;
    this.model.numeroCelular = limpio;
  }

  /** Deja solo dígitos y recorta al largo indicado. */
  private soloDigitos(valor: string | null, largo: number): string {
    return (valor ?? '').replace(/\D/g, '').slice(0, largo);
  }

  // ── Validación por paso ──────────────────────────────────────────────────
  private lleno(v: string | null): boolean {
    return !!v && v.trim().length > 0;
  }

  get puedeAvanzarP1(): boolean {
    const m = this.model;
    return (
      this.lleno(m.nombresCompletos) &&
      !!m.fechaNacimiento &&
      !!m.estadoCivilId &&
      !!m.tipoDocumentoId &&
      this.documentoValido &&
      !!m.distritoId &&
      this.lleno(m.correoElectronico) &&
      this.lleno(m.numeroCelular) &&
      this.lleno(m.pretensionesSalariales) &&
      !!m.disponibilidadId
    );
  }

  get puedeAvanzarP2(): boolean {
    const m = this.model;
    return this.lleno(m.profesion) && !!m.universidadId && !!m.gradoAcademicoId;
  }

  get puedeAvanzarP3(): boolean {
    const m = this.model;
    return (
      this.lleno(m.empresa) &&
      this.lleno(m.areaTrabajo) &&
      this.lleno(m.cargo) &&
      !!m.fechaInicio &&
      !!m.motivoCeseId &&
      this.lleno(m.funcionesPrincipales) &&
      this.lleno(m.logros) &&
      this.lleno(m.ingresoBrutoMensual) &&
      this.lleno(m.jefeInmediato) &&
      m.autorizaVerificacionReferencias !== null
    );
  }

  get puedeEnviar(): boolean {
    return this.model.declaracionVeracidad === true && this.model.confirmacionDocumentos === true;
  }

  get pasoActualValido(): boolean {
    switch (this.paso) {
      case 1: return this.puedeAvanzarP1;
      case 2: return this.puedeAvanzarP2;
      case 3: return this.puedeAvanzarP3;
      case 4: return this.puedeEnviar;
      default: return false;
    }
  }

  // ── Navegación ───────────────────────────────────────────────────────────
  siguiente(): void {
    if (!this.pasoActualValido) {
      this.avisoIncompleto();
      return;
    }
    if (this.paso < this.totalPasos) {
      this.paso++;
      this.scrollTop();
    }
  }

  anterior(): void {
    if (this.paso > 1) {
      this.paso--;
      this.scrollTop();
    }
  }

  private scrollTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private avisoIncompleto(): void {
    Swal.fire({
      icon: 'warning',
      title: 'Faltan datos',
      text: 'Completa los campos obligatorios de esta sección antes de continuar.',
      confirmButtonColor: '#005D9D',
    });
  }

  enviar(): void {
    if (!this.puedeEnviar) {
      Swal.fire({
        icon: 'warning',
        title: 'Consentimiento requerido',
        text: 'Debes confirmar la veracidad de la información y que completaste los documentos requeridos.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    this.enviando = true;
    // App zoneless: forzamos el refresco para reflejar el estado de envío y la pantalla final.
    this.service.guardarPublico(this.token, this.model).subscribe({
      next: () => {
        this.enviando = false;
        this.enviado = true;
        this.cdr.detectChanges();
        this.scrollTop();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'No se pudo enviar',
          text: err.error?.message ?? 'Ocurrió un error al enviar el formulario. Inténtalo nuevamente.',
          confirmButtonColor: '#005D9D',
        });
      },
    });
  }

  /** Setea un consentimiento booleano (Sí/No). */
  setBool(campo: 'autorizaVerificacionReferencias' | 'declaracionVeracidad' | 'confirmacionDocumentos', valor: boolean): void {
    this.model[campo] = valor;
  }
}
