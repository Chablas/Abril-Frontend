import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';
import { AprobacionGerenciaService } from '../shared/services/aprobacion-gerencia.service';
import { AprobacionGgPublico, AprobacionGgVacante } from '../shared/dtos/aprobacion-gerencia.dto';

/**
 * Página PÚBLICA de aprobación de Gerencia General (acceso por token, sin login). Es a donde
 * llegan los tres botones del correo que recibe el Gerente General:
 *
 *   • `accion=aprobar-todo`   → entra con todas las vacantes marcadas como aprobadas.
 *   • `accion=revisar`        → entra sin marcar nada, para elegir vacante por vacante.
 *   • `accion=rechazar-todo`  → entra con todas marcadas como rechazadas.
 *
 * En los tres casos la decisión se confirma con un click acá: el correo no la ejecuta solo. Es a
 * propósito, porque los clientes de correo precargan los enlaces y una aprobación por GET se
 * dispararía sin que nadie la haya decidido.
 */
@Component({
  standalone: true,
  selector: 'app-gth-aprobacion-gerencia',
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './aprobacion-gerencia.html',
  styleUrl: './aprobacion-gerencia.css',
})
export class AprobacionGerencia implements OnInit {
  token = '';
  cargando = true;
  enviando = false;
  /** true cuando la carga falla o el token no es válido. */
  errorCarga = false;
  mensajeError = '';

  /** true cuando el GG acaba de registrar su decisión (pantalla de confirmación). */
  enviado = false;
  mensajeExito = '';

  data: AprobacionGgPublico | null = null;

  /** Decisión en curso por requerimiento: true = aprobar, false = rechazar, undefined = sin elegir. */
  decisiones = new Map<number, boolean>();

  comentario = '';

  constructor(
    private route: ActivatedRoute,
    private service: AprobacionGerenciaService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.token = params.get('token') ?? '';
    if (!this.token) {
      this.errorCarga = true;
      this.mensajeError = 'El enlace de aprobación no es válido.';
      this.cargando = false;
      return;
    }
    this.cargar(params.get('accion'));
  }

  private cargar(accion: string | null): void {
    this.cargando = true;
    // App zoneless: hay que forzar el refresco tras el subscribe o la vista no se actualiza.
    this.service.getPublico(this.token).subscribe({
      next: (data) => {
        this.data = data;
        this.comentario = data.comentario ?? '';
        this.preseleccionar(accion, data.vacantes);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError =
          err.error?.message ??
          'No se pudo abrir la solicitud. Verifica el enlace del correo e inténtalo de nuevo.';
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Aplica la acción con la que el GG entró desde el correo. "revisar" (o cualquier otro valor)
   * no marca nada a propósito: obliga a elegir explícitamente qué vacante se aprueba.
   */
  private preseleccionar(accion: string | null, vacantes: AprobacionGgVacante[]): void {
    if (accion === 'aprobar-todo') this.marcarTodas(true);
    else if (accion === 'rechazar-todo') this.marcarTodas(false);
    else this.decisiones.clear();
    // Una solicitud ya decidida se muestra en modo lectura con lo que quedó registrado.
    if (this.data?.decidida) {
      this.decisiones.clear();
      for (const v of vacantes) if (v.aprobado !== null) this.decisiones.set(v.requerimientoId, v.aprobado);
    }
  }

  // ── Decisión por vacante ────────────────────────────────────────────────
  get vacantes(): AprobacionGgVacante[] {
    return this.data?.vacantes ?? [];
  }

  get soloLectura(): boolean {
    return !!this.data?.decidida;
  }

  decision(v: AprobacionGgVacante): boolean | undefined {
    return this.decisiones.get(v.requerimientoId);
  }

  marcar(v: AprobacionGgVacante, aprobado: boolean): void {
    if (this.soloLectura) return;
    this.decisiones.set(v.requerimientoId, aprobado);
  }

  marcarTodas(aprobado: boolean): void {
    if (this.soloLectura) return;
    for (const v of this.vacantes) this.decisiones.set(v.requerimientoId, aprobado);
  }

  get aprobadas(): number {
    return this.vacantes.filter((v) => this.decisiones.get(v.requerimientoId) === true).length;
  }

  get rechazadas(): number {
    return this.vacantes.filter((v) => this.decisiones.get(v.requerimientoId) === false).length;
  }

  /** Faltan vacantes por decidir: no se puede confirmar una decisión a medias. */
  get pendientes(): number {
    return this.vacantes.length - this.aprobadas - this.rechazadas;
  }

  get puedeConfirmar(): boolean {
    return !this.soloLectura && !this.enviando && this.vacantes.length > 0 && this.pendientes === 0;
  }

  /** Resumen que se muestra junto al botón de confirmar. */
  get resumenDecision(): string {
    if (this.pendientes > 0) {
      return this.pendientes === 1
        ? 'Falta decidir 1 vacante.'
        : `Faltan decidir ${this.pendientes} vacantes.`;
    }
    if (this.rechazadas === 0) return `Aprobarás las ${this.aprobadas} vacantes solicitadas.`;
    if (this.aprobadas === 0) return `Rechazarás las ${this.rechazadas} vacantes solicitadas.`;
    return `Aprobarás ${this.aprobadas} y rechazarás ${this.rechazadas}.`;
  }

  // ── Confirmación ────────────────────────────────────────────────────────
  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;

    const detalle =
      this.aprobadas === 0
        ? 'Ninguna vacante continuará y Gestión de Talento Humano no recibirá la solicitud.'
        : this.rechazadas === 0
          ? `Las ${this.aprobadas} vacantes pasarán a Gestión de Talento Humano para iniciar el reclutamiento.`
          : `${this.aprobadas} vacante(s) pasarán a Gestión de Talento Humano y ${this.rechazadas} no continuarán.`;

    const confirm = await Swal.fire({
      title: '¿Confirmas tu decisión?',
      html: `${detalle}<br><br><b>Esta decisión no se puede cambiar después.</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    });
    if (!confirm.isConfirmed) return;

    this.enviando = true;
    this.service
      .decidir(this.token, {
        decisiones: this.vacantes.map((v) => ({
          requerimientoId: v.requerimientoId,
          aprobado: this.decisiones.get(v.requerimientoId) === true,
        })),
        comentario: this.comentario.trim() ? this.comentario.trim() : null,
      })
      .subscribe({
        next: (res) => {
          this.enviando = false;
          this.enviado = true;
          this.mensajeExito = res.message;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.enviando = false;
          this.cdr.detectChanges();
          Swal.fire({
            title: 'No se pudo registrar la decisión',
            text: err.error?.message ?? 'Vuelve a intentarlo en unos minutos.',
            icon: 'error',
            confirmButtonColor: 'var(--color-abril-logo-blue)',
          });
        },
      });
  }
}
