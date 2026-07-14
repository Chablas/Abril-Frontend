import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../../shared/pipes/title-case.pipe';
import {
  WorkerRevisorAsignadoDTO,
  WorkerRevisorSalidaItemDTO,
} from '../../dtos/workerRevisorSalida.model';

/**
 * Modal de solo lectura con los n revisores de un trabajador, ordenados por
 * prioridad. Evita que la tabla principal crezca cuando un trabajador tiene
 * muchos revisores.
 */
@Component({
  standalone: true,
  selector: 'app-revisor-salida-detalle',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe],
  templateUrl: './detalle.html',
})
export class RevisorSalidaDetalle {
  @Input() worker!: WorkerRevisorSalidaItemDTO;
  @Output() closeModal = new EventEmitter<void>();

  get revisores(): WorkerRevisorAsignadoDTO[] {
    return [...(this.worker?.revisores ?? [])].sort((a, b) => a.ordenPrioridad - b.ordenPrioridad);
  }

  /** true si ningún revisor está activo → las solicitudes van al área de GTH. */
  get usaFallbackGth(): boolean {
    return !this.revisores.some((r) => r.active);
  }
}
