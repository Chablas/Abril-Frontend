import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../../shared/pipes/title-case.pipe';
import { AreaAsignacionItemDTO, AreaAsignadoDTO } from '../../dtos/asignacion-area.dto';

/**
 * Modal de solo lectura con las n personas asignadas a un área, por prioridad. Evita que la tabla
 * principal crezca cuando un área tiene muchas.
 */
@Component({
  standalone: true,
  selector: 'app-asignaciones-areas-detalle',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe],
  templateUrl: './detalle.html',
})
export class AsignacionesAreasDetalle {
  @Input() area!: AreaAsignacionItemDTO;
  /** "Revisor" / "Consolidador". */
  @Input() singular = 'Revisor';
  /** "Revisores" / "Consolidadores". */
  @Input() plural = 'Revisores';
  /** Nombre del proyecto cuando se muestra el alcance de un proyecto (para el título). */
  @Input() projectName?: string;
  /** Asignados a mostrar. Por defecto los del área. */
  @Input() asignadosOverride?: AreaAsignadoDTO[];
  @Output() closeModal = new EventEmitter<void>();

  get titulo(): string {
    const alcance = this.projectName || this.area?.areaName || 'Área';
    return `${this.plural.toUpperCase()} · ${alcance}`;
  }

  get asignados(): AreaAsignadoDTO[] {
    const base = this.asignadosOverride ?? this.area?.asignados ?? [];
    return [...base].sort((a, b) => a.ordenPrioridad - b.ordenPrioridad);
  }

  /** true si ninguno está activo: el área queda resuelta por el algoritmo. */
  get sinActivos(): boolean {
    return !this.asignados.some((a) => a.active);
  }

  /** Aviso de estado, no explicación: qué está pasando hoy con esta área. */
  get avisoSinActivos(): string {
    const nada = this.asignados.length === 0
      ? `Sin ${this.plural.toLowerCase()} asignados`
      : `Ningún ${this.singular.toLowerCase()} está activo`;
    return `${nada}: el área se resuelve por el algoritmo.`;
  }
}
