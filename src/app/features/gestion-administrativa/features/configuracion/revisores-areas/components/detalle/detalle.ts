import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../../shared/pipes/title-case.pipe';
import { AreaRevisorAsignadoDTO, AreaRevisorItemDTO } from '../../dtos/areaRevisor.model';

/**
 * Modal de solo lectura con los n revisores de un área, ordenados por
 * prioridad. Evita que la tabla principal crezca cuando un área tiene
 * muchos revisores.
 */
@Component({
  standalone: true,
  selector: 'app-revisores-areas-detalle',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe],
  templateUrl: './detalle.html',
})
export class RevisoresAreasDetalle {
  @Input() area!: AreaRevisorItemDTO;
  @Output() closeModal = new EventEmitter<void>();

  get revisores(): AreaRevisorAsignadoDTO[] {
    return [...(this.area?.revisores ?? [])].sort((a, b) => a.ordenPrioridad - b.ordenPrioridad);
  }

  /** true si ningún revisor está activo → las solicitudes van al área de GTH. */
  get usaFallbackGth(): boolean {
    return !this.revisores.some((r) => r.active);
  }
}
