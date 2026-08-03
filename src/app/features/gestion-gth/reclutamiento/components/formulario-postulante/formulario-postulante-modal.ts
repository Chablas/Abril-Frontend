import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ReclutamientoService } from '../../services/reclutamiento.service';
import { CandidatoFormularioResumen, FormularioRevision } from '../../dtos/formulario-postulante.dto';

/**
 * Modal "Ver formulario" del postulante (vista de GTH). Es el mismo modal para los 3 estados:
 *   • Aún sin completar (o sin enviar): muestra la estructura de campos + el estado (vacío).
 *   • Completado: muestra los datos declarados + botones Aprobar / Rechazar.
 *   • Aprobado / Rechazado: muestra los datos + el aviso "Aprobado/Rechazado por … el …".
 * Al aprobar/rechazar emite el nuevo estado para que la bandeja actualice el botón del candidato.
 */
@Component({
  standalone: true,
  selector: 'app-gth-formulario-postulante-modal',
  imports: [CommonModule, AbrilModalPanel, TitleCasePipe],
  templateUrl: './formulario-postulante-modal.html',
  styles: [`
    .ff-box {
      border: 1px solid var(--color-abril-border, #e2e8f0);
      background: #f9fafb;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .ff-label {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #9ca3af;
      margin: 0;
    }
    .ff-value {
      font-size: 13px;
      color: #1f2937;
      margin-top: 2px;
      word-break: break-word;
      line-height: 1.4;
    }
  `],
})
export class GthFormularioPostulanteModal implements OnInit {
  @Input({ required: true }) candidatoId!: number;
  @Output() closeModal = new EventEmitter<void>();
  /** Emite el nuevo estado del formulario tras aprobar/rechazar (para refrescar la bandeja). */
  @Output() cambios = new EventEmitter<CandidatoFormularioResumen>();

  revision: FormularioRevision | null = null;
  procesando = false;

  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getFormularioRevision(this.candidatoId).subscribe({
      next: (data) => {
        this.revision = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cerrar();
      },
    });
  }

  cerrar(): void {
    this.closeModal.emit();
  }

  // ── Estado ────────────────────────────────────────────────────────────
  get estado(): string {
    return this.revision?.existe ? this.revision.estadoCodigo : 'PENDIENTE';
  }

  get completado(): boolean {
    return this.estado === 'COMPLETADO';
  }

  get aprobado(): boolean {
    return this.estado === 'APROBADO';
  }

  get rechazado(): boolean {
    return this.estado === 'RECHAZADO';
  }

  /** Hay datos que mostrar (el postulante ya llenó el formulario). */
  get tieneDatos(): boolean {
    return !!this.revision?.datos;
  }

  // ── Acciones ────────────────────────────────────────────────────────────
  aprobar(): void {
    if (this.procesando) return;
    this.procesando = true;
    this.loaderService.show();
    this.service.decisionFormulario(this.candidatoId, true).subscribe({
      next: (res) => {
        this.aplicarDecision(res.formulario);
        this.loaderService.hide();
        this.procesando = false;
        Swal.fire({ icon: 'success', title: 'Formulario aprobado', text: res.message, confirmButtonColor: '#005D9D' });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.procesando = false;
        this.errorService.handleError(err);
      },
    });
  }

  async rechazar(): Promise<void> {
    if (this.procesando) return;

    const { value: motivo, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: 'Rechazar formulario',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo (opcional)',
      inputPlaceholder: 'Indica por qué se rechaza el formulario…',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B91C1C',
    });
    if (!isConfirmed) return;

    this.procesando = true;
    this.loaderService.show();
    this.service.decisionFormulario(this.candidatoId, false, motivo || null).subscribe({
      next: (res) => {
        this.aplicarDecision(res.formulario, motivo || null);
        this.loaderService.hide();
        this.procesando = false;
        Swal.fire({ icon: 'success', title: 'Formulario rechazado', text: res.message, confirmButtonColor: '#005D9D' });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.procesando = false;
        this.errorService.handleError(err);
      },
    });
  }

  private aplicarDecision(resumen: CandidatoFormularioResumen, motivo: string | null = null): void {
    if (this.revision) {
      this.revision.estadoCodigo = resumen.estadoCodigo ?? this.revision.estadoCodigo;
      this.revision.estadoNombre = resumen.estadoNombre ?? this.revision.estadoNombre;
      this.revision.revisadoNombre = resumen.revisadoNombre;
      this.revision.revisadoEn = resumen.revisadoEn;
      this.revision.motivoRechazo = motivo;
    }
    this.cambios.emit(resumen);
  }

  // ── Formato ───────────────────────────────────────────────────────────
  /** 'YYYY-MM-DD' → 'dd/MM/yyyy' sin desfase de zona horaria. */
  fmtFecha(v: string | null | undefined): string {
    if (!v) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
  }

  /** Fecha-hora (ISO en hora Perú) → 'dd/MM/yyyy · HH:mm'. */
  fmtFechaHora(v: string | null | undefined): string {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  boolTexto(v: boolean | null | undefined): string {
    if (v === true) return 'Sí';
    if (v === false) return 'No';
    return '—';
  }
}
