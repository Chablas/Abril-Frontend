import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { SpiBadgeComponent } from '../spi-badge/spi-badge.component';
import { EjecucionModalComponent } from '../ejecucion-modal/ejecucion-modal.component';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoActividadDto, PasoEjecucionDto } from '../../dtos/paso.dtos';

interface CategoriaGroup {
  id: number;
  nombre: string;
  icono: string;
  actividades: PasoActividadDto[];
}

@Component({
  selector: 'app-actividad-tree',
  standalone: true,
  imports: [CommonModule, RouterModule, SpiBadgeComponent, EjecucionModalComponent],
  templateUrl: './actividad-tree.component.html',
})
export class ActividadTreeComponent {
  @Input() set actividades(list: PasoActividadDto[]) {
    this._actividades = list;
    this.buildGroups();
  }
  get actividades(): PasoActividadDto[] { return this._actividades; }

  @Input() pasoId!: number;
  @Output() actividadEditarClick = new EventEmitter<PasoActividadDto>();
  @Output() actividadEliminada = new EventEmitter<number>();
  @Output() ejecucionRegistrada = new EventEmitter<PasoEjecucionDto>();

  private _actividades: PasoActividadDto[] = [];
  groups: CategoriaGroup[] = [];
  actividadEjecutando: PasoActividadDto | null = null;

  constructor(
    private actividadService: PasoActividadService,
    private cdr: ChangeDetectorRef,
  ) {}

  private buildGroups(): void {
    const map = new Map<number, CategoriaGroup>();
    for (const a of this._actividades) {
      if (!map.has(a.categoriaId)) {
        map.set(a.categoriaId, { id: a.categoriaId, nombre: a.categoriaNombre, icono: 'ti-tag', actividades: [] });
      }
      map.get(a.categoriaId)!.actividades.push(a);
    }
    this.groups = Array.from(map.values());
  }

  ejecutadas(a: PasoActividadDto): number {
    return (a.ejecuciones ?? []).filter(e => e.estado === 'Ejecutado').length;
  }

  progreso(a: PasoActividadDto): number {
    if (!a.cantidadPlanificada) return 0;
    return Math.min(100, Math.round((this.ejecutadas(a) / a.cantidadPlanificada) * 100));
  }

  spiActividad(a: PasoActividadDto): number | null {
    const total = a.cantidadPlanificada;
    if (!total) return null;
    return Math.min(1, this.ejecutadas(a) / total);
  }

  frecuenciaBadge(f: string): string {
    const map: Record<string, string> = {
      Mensual: 'bg-blue-100 text-blue-700',
      Bimestral: 'bg-cyan-100 text-cyan-700',
      Trimestral: 'bg-teal-100 text-teal-700',
      Semestral: 'bg-indigo-100 text-indigo-700',
      Anual: 'bg-purple-100 text-purple-700',
      Unica: 'bg-gray-100 text-gray-600',
    };
    return map[f] ?? 'bg-gray-100 text-gray-600';
  }

  abrirEjecucion(a: PasoActividadDto): void {
    this.actividadEjecutando = a;
  }

  onEjecucionCreada(e: PasoEjecucionDto): void {
    this.actividadEjecutando = null;
    this.ejecucionRegistrada.emit(e);
    this.cdr.detectChanges();
  }

  onEditar(a: PasoActividadDto): void {
    this.actividadEditarClick.emit(a);
  }

  onEliminar(a: PasoActividadDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar actividad?',
      text: a.nombre,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#ef4444',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.actividadService.delete(a.id).subscribe({
        next: () => {
          this.actividadEliminada.emit(a.id);
          this.cdr.detectChanges();
        },
        error: () => Swal.fire('Error', 'No se pudo eliminar la actividad', 'error'),
      });
    });
  }
}
