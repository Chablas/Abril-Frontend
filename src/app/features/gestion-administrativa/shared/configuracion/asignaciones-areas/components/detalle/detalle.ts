import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../../shared/pipes/title-case.pipe';
import {
  AreaAsignacionItemDTO,
  AreaAsignadoDTO,
  AreaEfectivoDTO,
  AreaEfectivoOrigen,
  AsignacionAreaModo,
} from '../../dtos/asignacion-area.dto';

/**
 * Modal de solo lectura de un área (o de un proyecto dentro de un área).
 *
 * Muestra primero a los VIGENTES: las personas que hoy quedan a cargo, vengan del algoritmo, de una
 * asignación a mano o del fallback por defecto. Es el único lugar donde se ve quiénes son: la
 * columna de la tabla muestra al primero y cuenta al resto con un "+N más".
 *
 * Debajo, y solo si el área tiene algo cargado a mano, van los asignados con su prioridad y si
 * están activos — que es lo que explica por qué los vigentes son los que son.
 *
 * En Revisores de Rendiciones cada fila trae además las dos casillas del modal de edición en solo
 * lectura: en una obra intervienen dos —el administrador revisa la planilla y firma, el residente
 * solo firma— y sin ellas la lista no diría en qué paso entra cada uno.
 */
@Component({
  standalone: true,
  selector: 'app-asignaciones-areas-detalle',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe],
  templateUrl: './detalle.html',
})
export class AsignacionesAreasDetalle {
  @Input() area!: AreaAsignacionItemDTO;
  /** Pantalla que abrió el modal: decide si se muestran las casillas por paso. */
  @Input() modo: AsignacionAreaModo = 'revisores';
  /** "Revisor" / "Consolidador". */
  @Input() singular = 'Revisor';
  /** "Revisores" / "Consolidadores". */
  @Input() plural = 'Revisores';
  /** Nombre del proyecto cuando se muestra el alcance de un proyecto (para el título). */
  @Input() projectName?: string;
  /** Asignados a mostrar. Por defecto los del área. */
  @Input() asignadosOverride?: AreaAsignadoDTO[];
  /** Vigentes a mostrar. Por defecto los del área. */
  @Input() efectivosOverride?: AreaEfectivoDTO[];
  @Output() closeModal = new EventEmitter<void>();

  get titulo(): string {
    const alcance = this.projectName || this.area?.areaName || 'Área';
    return `${this.plural.toUpperCase()} · ${alcance}`;
  }

  get vigentes(): AreaEfectivoDTO[] {
    return this.efectivosOverride ?? this.area?.efectivos ?? [];
  }

  /** Las dos casillas por persona (1.ª revisión / consolidado) solo existen en Rendiciones. */
  get esModoRendicion(): boolean {
    return this.modo === 'revisoresRendicion';
  }

  get asignados(): AreaAsignadoDTO[] {
    const base = this.asignadosOverride ?? this.area?.asignados ?? [];
    return [...base].sort((a, b) => a.ordenPrioridad - b.ordenPrioridad);
  }

  /**
   * Etiqueta de origen, igual que en la columna de la tabla: si a esa persona la puso alguien a
   * mano, la dedujo el sistema o es el último recurso.
   */
  origenLabel(origen?: AreaEfectivoOrigen | null): string {
    if (origen === 'Personalizado') return 'Personalizado';
    if (origen === 'Gth') return 'Por defecto';
    return 'Algoritmo';
  }

  /** Colores del badge de origen: lo cargado a mano se distingue de lo que resolvió el sistema. */
  origenClases(origen?: AreaEfectivoOrigen | null): string {
    if (origen === 'Personalizado') return 'bg-[var(--color-abril-standard-light)] text-[var(--color-abril-standard)]';
    if (origen === 'Gth') return 'bg-[#FEF9C3] text-[#92400E]';
    return 'bg-[#E8F1FB] text-[var(--color-abril-logo-blue)]';
  }

  /** true si hay asignados a mano pero ninguno activo: el área la resuelve el algoritmo. */
  get sinActivos(): boolean {
    return this.asignados.length > 0 && !this.asignados.some((a) => a.active);
  }

  /** Aviso de estado, no explicación: qué está pasando hoy con esta área. */
  get avisoSinActivos(): string {
    return `Ningún ${this.singular.toLowerCase()} asignado está activo: el área se resuelve por el algoritmo.`;
  }
}
