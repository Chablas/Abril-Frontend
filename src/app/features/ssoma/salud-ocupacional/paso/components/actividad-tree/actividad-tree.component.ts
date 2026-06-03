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
  styleUrl: './actividad-tree.component.css',
})
export class ActividadTreeComponent {
  @Input() set actividades(list: PasoActividadDto[]) {
    this._actividades = list;
    this.buildGroups();
  }
  get actividades(): PasoActividadDto[] { return this._actividades; }

  @Input() pasoId!: number;
  @Input() ambito: 'Seguridad' | 'Salud' | 'Ambiente' | 'Gantt' = 'Seguridad';
  @Output() actividadEditarClick = new EventEmitter<PasoActividadDto>();
  @Output() actividadEliminada = new EventEmitter<number>();
  @Output() ejecucionRegistrada = new EventEmitter<PasoEjecucionDto>();

  private _actividades: PasoActividadDto[] = [];
  groups: CategoriaGroup[] = [];
  collapsedGroups = new Set<number>();
  actividadEjecutando: PasoActividadDto | null = null;

  readonly mesActual = new Date().getMonth() + 1;

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

  toggleGroup(id: number): void {
    if (this.collapsedGroups.has(id)) {
      this.collapsedGroups.delete(id);
    } else {
      this.collapsedGroups.add(id);
    }
  }

  isCollapsed(id: number): boolean { return this.collapsedGroups.has(id); }

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

  ejecucionMesActual(a: PasoActividadDto): { estado: string; label: string } {
    const ejeMes = (a.ejecuciones ?? []).filter(e => {
      const d = new Date(e.fechaProgramada);
      return d.getMonth() + 1 === this.mesActual;
    });
    if (!ejeMes.length) return { estado: 'sin', label: 'Sin ejecución este mes' };
    const ej = ejeMes[ejeMes.length - 1];
    switch (ej.estado) {
      case 'Ejecutado':  return { estado: 'ejecutado',  label: 'Ejecutada este mes' };
      case 'Vencido':    return { estado: 'vencido',    label: 'Vencida este mes' };
      case 'Programado': return { estado: 'programado', label: 'Programada este mes' };
      default:           return { estado: 'sin',        label: 'Sin ejecución' };
    }
  }

  frecuenciaClass(f: string): string {
    const m: Record<string, string> = {
      Mensual: 'freq-badge--mensual',
      Bimestral: 'freq-badge--bimestral',
      Trimestral: 'freq-badge--trimestral',
      Semestral: 'freq-badge--semestral',
      Anual: 'freq-badge--anual',
      Unica: 'freq-badge--unica',
    };
    return m[f] ?? 'freq-badge--unica';
  }

  ambitoClass(): string {
    const m: Record<string, string> = { Seguridad: 'seg', Salud: 'sal', Ambiente: 'amb' };
    return m[this.ambito] ?? 'default';
  }

  avatarInitials(nombre: string): string {
    return nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  abrirEjecucion(a: PasoActividadDto): void { this.actividadEjecutando = a; }

  onEjecucionCreada(e: PasoEjecucionDto): void {
    this.actividadEjecutando = null;
    this.ejecucionRegistrada.emit(e);
    this.cdr.detectChanges();
  }

  onEditar(a: PasoActividadDto): void { this.actividadEditarClick.emit(a); }

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
        next: () => { this.actividadEliminada.emit(a.id); this.cdr.detectChanges(); },
        error: () => Swal.fire('Error', 'No se pudo eliminar la actividad', 'error'),
      });
    });
  }
}
