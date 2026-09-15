import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { AsignacionesAreasService } from '../../services/asignaciones-areas.service';
import {
  AreaAsignacionItemDTO,
  AreaAsignadoDTO,
  AreaWorkerOptionDTO,
  AsignacionAreaModo,
} from '../../dtos/asignacion-area.dto';

/** Fila editable: la posición en la lista define la prioridad (1 = primera). */
interface AsignadoRow {
  workerId: number | null;
  active: boolean;
}

/**
 * Modal de edición de las n personas asignadas a un área. El orden de las filas define la
 * prioridad (se puede subir/bajar); el toggle Activo permite "pausar" a alguien (ej. ausencia
 * temporal) sin quitarlo de la lista.
 */
@Component({
  standalone: true,
  selector: 'app-asignaciones-areas-editar',
  imports: [CommonModule, BaseModal, SearchSelect],
  templateUrl: './editar.html',
})
export class AsignacionesAreasEditar implements OnInit {
  @Input({ required: true }) modo!: AsignacionAreaModo;
  @Input() area!: AreaAsignacionItemDTO;
  /** "Revisor" / "Consolidador". */
  @Input() singular = 'Revisor';
  /** "Revisores" / "Consolidadores". */
  @Input() plural = 'Revisores';
  /** true = de los activos solo cuenta el primero (revisores). */
  @Input() ganaSoloUno = true;
  @Input() options: AreaWorkerOptionDTO[] = [];
  /** null = a nivel de área; con valor = del proyecto dentro del área. */
  @Input() projectId: number | null = null;
  /** Nombre del proyecto (para el título) cuando se edita el alcance de un proyecto. */
  @Input() projectName?: string;
  /** Asignados iniciales del alcance editado. Por defecto los del área. */
  @Input() asignadosIniciales?: AreaAsignadoDTO[];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  rows: AsignadoRow[] = [];

  get titulo(): string {
    const alcance = this.projectName || this.area?.areaName || 'Área';
    return `EDITAR ${this.plural.toUpperCase()} · ${alcance}`;
  }

  /** Aviso de estado de una línea: qué significa el orden en este modo. */
  get avisoRegla(): string {
    return this.ganaSoloUno
      ? 'Se usa el primero activo; el resto queda de respaldo.'
      : 'Todos los activos quedan habilitados para consolidar.';
  }

  constructor(
    private service: AsignacionesAreasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    const iniciales = this.asignadosIniciales ?? this.area.asignados ?? [];
    this.rows = [...iniciales]
      .sort((a, b) => a.ordenPrioridad - b.ordenPrioridad)
      .map((a) => ({ workerId: a.workerId, active: a.active }));
    if (this.rows.length === 0) this.agregar();
  }

  /** Opciones de una fila: todos menos los ya elegidos en otras filas. */
  opcionesFila(index: number): AreaWorkerOptionDTO[] {
    const usados = new Set(this.rows.filter((_, i) => i !== index).map((r) => r.workerId));
    return this.options.filter((o) => !usados.has(o.workerId));
  }

  agregar(): void {
    this.rows.push({ workerId: null, active: true });
  }

  quitar(index: number): void {
    this.rows.splice(index, 1);
  }

  mover(index: number, delta: number): void {
    const destino = index + delta;
    if (destino < 0 || destino >= this.rows.length) return;
    [this.rows[index], this.rows[destino]] = [this.rows[destino], this.rows[index]];
  }

  guardar(): void {
    const validas = this.rows.filter((r) => r.workerId != null);
    if (validas.length !== this.rows.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Filas incompletas',
        text: `Selecciona un ${this.singular.toLowerCase()} en cada fila o quita las filas vacías.`,
        confirmButtonColor: '#0F6E56',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .update(this.modo, this.area.areaScopeId, {
        projectId: this.projectId,
        // La posición define la prioridad: 1 = primera fila.
        asignados: validas.map((r, i) => ({
          workerId: r.workerId!,
          ordenPrioridad: i + 1,
          active: r.active,
        })),
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.saved.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
