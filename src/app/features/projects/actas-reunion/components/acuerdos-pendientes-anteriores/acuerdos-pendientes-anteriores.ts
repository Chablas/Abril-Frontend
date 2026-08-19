import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import { AcuerdoPendienteAnteriorDTO } from '../../dtos/actas-reunion.dto';

/**
 * Revisión de acuerdos aún no cumplidos de ediciones anteriores de la misma convocatoria
 * recurrente (sube la cadena reunion_anterior_id). Se muestra al abrir la siguiente reunión,
 * antes de la agenda, para hacer seguimiento real: cada acuerdo se marca cumplido o se
 * reprograma con motivo — nunca queda "flotando" sin decisión.
 */
@Component({
  selector: 'app-acuerdos-pendientes-anteriores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acuerdos-pendientes-anteriores.html',
})
export class AcuerdosPendientesAnteriores implements OnInit {
  @Input({ required: true }) reunionId!: number;

  pendientes: AcuerdoPendienteAnteriorDTO[] = [];
  /** reunionAcuerdoId del acuerdo cuyo formulario de reprogramar está abierto, o null. */
  reprogramandoId: number | null = null;
  nuevaFecha = '';
  motivo = '';

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.service.getAcuerdosPendientesAnteriores(this.reunionId).subscribe({
      next: (data) => (this.pendientes = data),
      error: () => {},
    });
  }

  esVencido(a: AcuerdoPendienteAnteriorDTO): boolean {
    return !!a.fechaProgramada && a.fechaProgramada < new Date().toISOString().slice(0, 10);
  }

  criticidadClass(criticidad: string): string {
    switch (criticidad) {
      case 'CRITICO':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'MEDIO':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-gray-50 text-gray-500 border border-gray-200';
    }
  }

  criticidadLabel(criticidad: string): string {
    switch (criticidad) {
      case 'CRITICO':
        return 'Crítico';
      case 'MEDIO':
        return 'Medio';
      default:
        return 'Normal';
    }
  }

  responsablesLabel(a: AcuerdoPendienteAnteriorDTO): string {
    return a.responsables.map((r) => (r.esPrincipal ? `★ ${r.workerNombre}` : r.workerNombre)).join(' / ');
  }

  marcarCumplido(a: AcuerdoPendienteAnteriorDTO): void {
    if (a.requiereEvidencia && !a.evidenciaUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta evidencia',
        text: 'Este acuerdo requiere adjuntar evidencia antes de poder marcarse como cumplido.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const tieneEvidencia = !!a.evidenciaUrl;
    Swal.fire({
      icon: 'question',
      title: '¿Marcar acuerdo como cumplido?',
      input: 'textarea',
      inputLabel: tieneEvidencia ? 'Comentario (opcional)' : 'Cómo se levantó (obligatorio, no hay evidencia adjunta)',
      inputPlaceholder: 'Describe cómo se resolvió el acuerdo...',
      inputValidator: (value) => (!tieneEvidencia && !value?.trim() ? 'Indica cómo se levantó el acuerdo.' : undefined),
      showCancelButton: true,
      confirmButtonText: 'Sí, cumplido',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-primary)',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.marcarAcuerdoCumplido(a.reunionAcuerdoId, { comentario: result.value?.trim() || null }).subscribe({
        next: () => {
          this.loaderService.hide();
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  abrirReprogramar(a: AcuerdoPendienteAnteriorDTO): void {
    this.reprogramandoId = a.reunionAcuerdoId;
    this.nuevaFecha = a.fechaProgramada ?? '';
    this.motivo = '';
  }

  cancelarReprogramar(): void {
    this.reprogramandoId = null;
  }

  confirmarReprogramar(): void {
    if (!this.nuevaFecha || !this.motivo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Indica la nueva fecha y el motivo de la reprogramación.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .reprogramarAcuerdo(this.reprogramandoId!, {
        nuevaFechaProgramada: this.nuevaFecha,
        motivo: this.motivo.trim(),
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.reprogramandoId = null;
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
