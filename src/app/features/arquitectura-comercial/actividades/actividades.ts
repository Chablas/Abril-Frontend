import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ArquitecturaComercialService } from '../../../core/services/arquitectura-comercial.service';
import {
  ProyectoConActividadesDTO,
  SupervisorAcDTO,
  ActividadListItemDTO,
  ActividadPatchBody,
} from '../../../core/dtos/arquitectura-comercial/actividades.model';

type TipoFiltro = '' | 'Entregable' | 'Hito' | 'Consulta';

interface EtapaGroup {
  nombre: string;
  total: number;
  activas: number;
  items: ActividadListItemDTO[];
}

@Component({
  selector: 'app-arq-comercial-actividades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actividades.html',
  styleUrl: './actividades.css',
})
export class Actividades implements OnInit {
  proyectos: ProyectoConActividadesDTO[] = [];
  supervisores: SupervisorAcDTO[] = [];
  etapasDisponibles: { id: number; nombre: string }[] = [];

  selectedProyectoId: number | null = null;
  get selectedProyecto(): ProyectoConActividadesDTO | null {
    return this.proyectos.find(p => p.id === this.selectedProyectoId) ?? null;
  }

  actividades: ActividadListItemDTO[] = [];
  total = 0;
  loading = false;

  tipoFiltro: TipoFiltro = '';
  etapaIdFiltro: number | null = null;
  searchQuery = '';
  soloActivas = false;

  seleccionadas = new Set<number>();

  constructor(private service: ArquitecturaComercialService) {}

  ngOnInit(): void {
    this.loadProyectos();
    this.loadSupervisores();
  }

  loadProyectos(): void {
    this.service.getProyectosConActividades().subscribe({
      next: data => (this.proyectos = data),
      error: () => this.showError('No se pudieron cargar los proyectos'),
    });
  }

  loadSupervisores(): void {
    this.service.getSupervisoresAc().subscribe({
      next: data => (this.supervisores = data),
      error: () => this.showError('No se pudieron cargar los supervisores'),
    });
  }

  selectProyecto(p: ProyectoConActividadesDTO): void {
    if (this.selectedProyectoId === p.id) return;
    this.selectedProyectoId = p.id;
    this.seleccionadas.clear();
    this.resetFilters();
    this.loadActividades();
  }

  resetFilters(): void {
    this.tipoFiltro = '';
    this.etapaIdFiltro = null;
    this.searchQuery = '';
    this.soloActivas = false;
  }

  loadActividades(): void {
    if (!this.selectedProyectoId) return;
    this.loading = true;
    this.service
      .getActividades({
        proyectoId: this.selectedProyectoId,
        tipo: this.tipoFiltro || null,
        etapaId: this.etapaIdFiltro,
        search: this.searchQuery || null,
        soloActivas: this.soloActivas || null,
        pagina: 1,
        porPagina: 500,
      })
      .subscribe({
        next: data => {
          this.actividades = data.items;
          this.total = data.total;
          this.deriveEtapas();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.showError('No se pudieron cargar las actividades');
        },
      });
  }

  private deriveEtapas(): void {
    const map = new Map<number, string>();
    for (const a of this.actividades) {
      if (a.etapaId != null && a.etapaNombre && !map.has(a.etapaId)) {
        map.set(a.etapaId, a.etapaNombre);
      }
    }
    this.etapasDisponibles = Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }

  setTipo(t: TipoFiltro): void {
    this.tipoFiltro = t;
    this.loadActividades();
  }

  onSearchEnter(): void {
    this.loadActividades();
  }

  onFiltroChange(): void {
    this.loadActividades();
  }

  get etapasConActividades(): EtapaGroup[] {
    const groups = new Map<string, ActividadListItemDTO[]>();
    for (const a of this.actividades) {
      const key = a.etapaNombre || 'SIN ETAPA';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return Array.from(groups.entries()).map(([nombre, items]) => ({
      nombre,
      items,
      total: items.length,
      activas: items.filter(i => i.activo).length,
    }));
  }

  patchField(id: number, field: keyof ActividadPatchBody, value: any): void {
    const body: ActividadPatchBody = {};
    (body as any)[field] = value === '' ? null : value;
    this.service.patchActividad(id, body).subscribe({
      next: updated => {
        const idx = this.actividades.findIndex(a => a.id === id);
        if (idx >= 0) this.actividades[idx] = updated;
        if (this.selectedProyecto) {
          this.refreshSelectedProyectoCounts();
        }
      },
      error: err => {
        const msg = err?.error?.message ?? 'No se pudo guardar el cambio';
        this.showError(msg);
      },
    });
  }

  private refreshSelectedProyectoCounts(): void {
    if (!this.selectedProyecto) return;
    const activas = this.actividades.filter(a => a.activo).length;
    this.selectedProyecto.activas = activas;
  }

  onDateChange(id: number, field: keyof ActividadPatchBody, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchField(id, field, value || null);
  }

  onUserIdChange(id: number, event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const value = raw === '' || raw === 'null' ? null : Number(raw);
    this.patchField(id, 'userId', value);
  }

  onObservacionesBlur(id: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchField(id, 'observaciones', value || null);
  }

  aplicarEncargadoATodos(): void {
    if (!this.selectedProyectoId) return;
    const proyecto = this.selectedProyecto;
    if (!proyecto?.responsableArqCom) {
      this.showInfo('Este proyecto no tiene Encargado 1 definido en la tabla projects.');
      return;
    }

    Swal.fire({
      title: '¿Aplicar encargado a todas las actividades?',
      text: `Se asignará "${proyecto.responsableArqCom}" como responsable en todas las actividades de ${proyecto.nombre}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aplicar',
      cancelButtonText: 'Cancelar',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.reasignarEncargado(this.selectedProyectoId!).subscribe({
        next: res => {
          if (res.workerNoEncontrado) {
            this.showWarning(
              `No se encontró un worker con nombre "${proyecto.responsableArqCom}". Verifica que exista en la tabla workers.`,
            );
            return;
          }
          Swal.fire({
            icon: 'success',
            title: 'Listo',
            text: `${res.actualizadas} actividades actualizadas.`,
            timer: 2000,
          });
          this.loadActividades();
        },
        error: () => this.showError('No se pudo reasignar el encargado'),
      });
    });
  }

  generarActividades(proyecto: ProyectoConActividadesDTO, event?: Event): void {
    event?.stopPropagation();
    Swal.fire({
      title: '¿Generar actividades desde plantilla?',
      text: `Se crearán las actividades del plantilla en ${proyecto.nombre}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.generarActividades(proyecto.id).subscribe({
        next: res => {
          Swal.fire({
            icon: 'success',
            title: 'Listo',
            text: `${res.generadas} actividades generadas.`,
            timer: 2000,
          });
          this.loadProyectos();
          if (this.selectedProyectoId === proyecto.id) this.loadActividades();
        },
        error: err => {
          const msg = err?.error?.message ?? 'No se pudieron generar las actividades';
          this.showError(msg);
        },
      });
    });
  }

  toggleSeleccion(a: ActividadListItemDTO): void {
    if (!a.activo) return;
    if (this.seleccionadas.has(a.id)) this.seleccionadas.delete(a.id);
    else this.seleccionadas.add(a.id);
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'CULMINADO': return 'bg-green-100 text-green-800';
      case 'EN PROCESO': return 'bg-blue-100 text-blue-800';
      case 'VENCIDO': return 'bg-red-100 text-red-800';
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'VACIO': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  etapaClass(etapa: string | null): string {
    switch (etapa) {
      case 'PREVENTA': return 'bg-purple-100 text-purple-800';
      case 'OBRA': return 'bg-orange-100 text-orange-800';
      case 'EDIFICIO ENTREGADO': return 'bg-teal-100 text-teal-800';
      case 'POST VENTA Y EXPERIENCIA': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  proyectoRowClass(p: ProyectoConActividadesDTO): string {
    const base: string[] = [];
    if (this.selectedProyectoId === p.id) base.push('bg-[#E5F7D1] border-l-4 border-[#64BC04]');
    else base.push('hover:bg-gray-100');
    if (p.sinActividades) base.push('text-red-600');
    if (p.estado !== 'ACTIVO') base.push('opacity-60');
    return base.join(' ');
  }

  private showError(msg: string): void {
    Swal.fire({ icon: 'error', title: 'Error', text: msg });
  }

  private showWarning(msg: string): void {
    Swal.fire({ icon: 'warning', title: 'Atención', text: msg });
  }

  private showInfo(msg: string): void {
    Swal.fire({ icon: 'info', title: 'Info', text: msg });
  }
}
