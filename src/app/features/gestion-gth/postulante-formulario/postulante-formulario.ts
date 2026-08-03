import { Component, OnInit } from '@angular/core';
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

  paso = 1;
  readonly totalPasos = 4;
  readonly pasosNombres = ['Datos personales', 'Estudios', 'Experiencia laboral', 'Consentimiento'];

  constructor(
    private route: ActivatedRoute,
    private service: PostulanteFormularioService,
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
    this.service.getPublico(this.token).subscribe({
      next: (data) => {
        this.data = data;
        this.model = { ...respuestasVacias(), ...data.respuestas };
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError =
          err.error?.message ?? 'No se pudo cargar el formulario. Verifica el enlace e inténtalo de nuevo.';
      },
    });
  }

  // ── Catálogos (atajos para el template) ─────────────────────────────────
  get estadosCiviles(): OpcionFormulario[] { return this.data?.estadosCiviles ?? []; }
  get tiposDocumento(): OpcionFormulario[] { return this.data?.tiposDocumento ?? []; }
  get distritos(): DistritoOpcion[] { return this.data?.distritos ?? []; }
  get universidades(): OpcionFormulario[] { return this.data?.universidades ?? []; }
  get gradosAcademicos(): OpcionFormulario[] { return this.data?.gradosAcademicos ?? []; }
  get disponibilidades(): OpcionFormulario[] { return this.data?.disponibilidades ?? []; }
  get motivosCese(): OpcionFormulario[] { return this.data?.motivosCese ?? []; }
  get convocatorias(): OpcionFormulario[] { return this.data?.convocatorias ?? []; }

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
      this.lleno(m.numeroDocumento) &&
      !!m.distritoId &&
      this.lleno(m.correoElectronico) &&
      this.lleno(m.numeroCelular) &&
      !!m.convocatoriaId &&
      this.lleno(m.pretensionesSalariales) &&
      !!m.disponibilidadId &&
      this.lleno(m.linkedin)
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
    this.service.guardarPublico(this.token, this.model).subscribe({
      next: () => {
        this.enviando = false;
        this.enviado = true;
        this.scrollTop();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
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
