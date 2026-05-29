import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import {
  CronogramaActividadesService,
  ProyectoSimpleDto,
  ActividadDto,
  CrearActividadRequest,
  EditarActividadRequest,
} from '../../../core/services/cronograma-actividades.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-cronograma-actividades',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cronograma-actividades.html',
  styleUrl: './cronograma-actividades.css',
})
export class CronogramaActividades implements OnInit {
  // Datos
  proyectos: ProyectoSimpleDto[] = [];
  actividades: ActividadDto[] = [];
  selectedProyectoId: number | null = null;

  // Cargas
  loadingProyectos = false;
  loadingActividades = false;
  guardando = false;

  // Modal crear/editar
  modalOpen = false;
  modalMode: 'crear' | 'editar' = 'crear';
  editandoId: number | null = null;
  editandoAct: ActividadDto | null = null;

  // Modal importar MPP
  mppModalOpen = false;
  mppFile: File | null = null;
  importando = false;

  // Jerarquía
  collapsedIds = new Set<number>();
  private parentIds = new Set<number>();
  // colorMap guarda el color base de nivel-1 heredado por cada actividad
  private colorMap = new Map<number, string>();
  private readonly NIVEL0_COLOR = '#3F51B5';
  private readonly LEVEL1_PALETTE = [
    '#2196F3', '#009688', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#F44336', '#673AB7',
  ];
  private readonly SHADES: Record<string, { claro: string; oscuro: string }> = {
    '#2196F3': { claro: '#E3F2FD', oscuro: '#1565C0' },
    '#009688': { claro: '#E0F2F1', oscuro: '#00695C' },
    '#FF9800': { claro: '#FFF3E0', oscuro: '#E65100' },
    '#E91E63': { claro: '#FCE4EC', oscuro: '#880E4F' },
    '#9C27B0': { claro: '#F3E5F5', oscuro: '#6A1B9A' },
    '#00BCD4': { claro: '#E0F7FA', oscuro: '#006064' },
    '#F44336': { claro: '#FFEBEE', oscuro: '#B71C1C' },
    '#673AB7': { claro: '#EDE7F6', oscuro: '#4527A0' },
  };

  // Formulario del modal
  formActividad = '';
  formPlannedStart = '';
  formPlannedEnd = '';
  formActualEnd = '';
  formProgress = 0;

  constructor(
    private service: CronogramaActividadesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  get esAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR DE UDP') ||
      this.authService.hasRole('ADMINISTRADOR DE RESIDENTES')
    );
  }

  ngOnInit(): void {
    this.loadProyectos();
  }

  get proyecto(): ProyectoSimpleDto | undefined {
    return this.proyectos.find((p) => p.projectId === this.selectedProyectoId);
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────

  private loadProyectos(): void {
    this.loadingProyectos = true;
    this.loaderService.show();
    this.service.getProyectos().subscribe({
      next: (res) => {
        this.proyectos = res;
        this.loadingProyectos = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProyectos = false;
        this.errorService.handleError(err);
      },
    });
  }

  onProyectoChange(id: number | null): void {
    this.actividades = [];
    this.collapsedIds.clear();
    this.parentIds.clear();
    this.colorMap.clear();
    if (!id) return;
    this.loadActividades(id);
  }

  private loadActividades(proyectoId: number): void {
    this.loadingActividades = true;
    this.loaderService.show();
    this.service.getActividades(proyectoId).subscribe({
      next: (res) => {
        this.actividades = res ?? [];
        this.buildParentIds();
        this.buildColorMap();
        this.loadingActividades = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingActividades = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Jerarquía ─────────────────────────────────────────────────────────────

  private buildParentIds(): void {
    this.parentIds = new Set(
      this.actividades.filter((a) => a.parentId !== null).map((a) => a.parentId!),
    );
  }

  private buildColorMap(): void {
    this.colorMap.clear();
    let paletteIdx = 0;
    for (const act of this.actividades) {
      if (act.hierarchyLevel === 1) {
        const color = this.LEVEL1_PALETTE[paletteIdx % this.LEVEL1_PALETTE.length];
        this.colorMap.set(act.projectActivityId, color);
        paletteIdx++;
      } else if (act.hierarchyLevel >= 2) {
        const color = this.findLevel1Color(act);
        if (color) this.colorMap.set(act.projectActivityId, color);
      }
    }
  }

  private findLevel1Color(act: ActividadDto): string | null {
    if (act.parentId === null) return null;
    const parent = this.actividades.find((a) => a.projectActivityId === act.parentId);
    if (!parent) return null;
    if (parent.hierarchyLevel === 1) return this.colorMap.get(parent.projectActivityId) ?? null;
    return this.findLevel1Color(parent);
  }

  /** Shades (claro/oscuro) del color base de nivel-1 de una actividad. */
  private shadesOf(act: ActividadDto): { claro: string; oscuro: string } | null {
    const base = this.colorMap.get(act.projectActivityId);
    return base ? (this.SHADES[base] ?? null) : null;
  }

  getRowStyle(act: ActividadDto): Record<string, string> {
    if (act.hierarchyLevel === 0) {
      return { 'background-color': this.NIVEL0_COLOR, color: '#ffffff' };
    }
    if (act.hierarchyLevel === 1) {
      const color = this.colorMap.get(act.projectActivityId) ?? '#6b7280';
      return { 'background-color': color, color: '#ffffff' };
    }
    const shades = this.shadesOf(act);
    if (!shades) return {};
    return { 'background-color': shades.claro, color: shades.oscuro };
  }

  getBadgeStyle(act: ActividadDto): Record<string, string> {
    if (act.hierarchyLevel <= 1) {
      return { 'background-color': 'rgba(255, 255, 255, 0.2)', color: '#ffffff' };
    }
    const shades = this.shadesOf(act);
    if (!shades) return {};
    // colorClaro más oscuro = tinte del oscuro al 15% sobre la fila clara
    return { 'background-color': shades.oscuro + '26', color: shades.oscuro };
  }

  hasChildren(act: ActividadDto): boolean {
    return this.parentIds.has(act.projectActivityId);
  }

  isVisible(act: ActividadDto): boolean {
    if (act.parentId === null) return true;
    if (this.collapsedIds.has(act.parentId)) return false;
    const parent = this.actividades.find((a) => a.projectActivityId === act.parentId);
    return parent ? this.isVisible(parent) : true;
  }

  toggleCollapse(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    if (this.collapsedIds.has(act.projectActivityId)) {
      this.collapsedIds.delete(act.projectActivityId);
    } else {
      this.collapsedIds.add(act.projectActivityId);
    }
  }

  // ── Utilidades de formato ──────────────────────────────────────────────────

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const p = date.slice(0, 10).split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  getEstado(act: ActividadDto): { label: string; css: string } {
    if (act.actualEndDate) return { label: 'CULMINADO', css: 'badge-verde' };
    const hoy = new Date().toISOString().slice(0, 10);
    if (act.plannedEndDate && act.plannedEndDate < hoy) return { label: 'VENCIDO', css: 'badge-rojo' };
    if (act.plannedStartDate && act.plannedStartDate <= hoy) return { label: 'EN PROCESO', css: 'badge-azul' };
    return { label: 'PENDIENTE', css: 'badge-gris' };
  }

  getAvance(act: ActividadDto): number {
    return act.actualEndDate ? 100 : act.progressPercentage;
  }

  getAvanceColor(pct: number): string {
    if (pct === 100) return 'fill-verde';
    if (pct >= 70) return 'fill-azul';
    if (pct >= 31) return 'fill-amarillo';
    return 'fill-rojo';
  }

  // ── Modal ──────────────────────────────────────────────────────────────────

  abrirModalCrear(): void {
    this.modalMode = 'crear';
    this.editandoId = null;
    this.formActividad = '';
    this.formPlannedStart = '';
    this.formPlannedEnd = '';
    this.formActualEnd = '';
    this.formProgress = 0;
    this.guardando = false;
    this.modalOpen = true;
  }

  abrirModalEditar(act: ActividadDto): void {
    this.modalMode = 'editar';
    this.editandoId = act.projectActivityId;
    this.editandoAct = act;
    this.formActividad = act.activityDescription;
    this.formPlannedStart = act.plannedStartDate?.slice(0, 10) ?? '';
    this.formPlannedEnd = act.plannedEndDate?.slice(0, 10) ?? '';
    this.formActualEnd = act.actualEndDate?.slice(0, 10) ?? '';
    this.formProgress = act.progressPercentage ?? 0;
    this.guardando = false;
    this.modalOpen = true;
  }

  cerrarModal(): void {
    this.modalOpen = false;
    this.guardando = false;
    this.editandoAct = null;
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModal();
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  guardar(): void {
    if (!this.selectedProyectoId) return;
    if (!this.formActividad.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre de la actividad es obligatorio.',
        confirmButtonColor: '#2596be',
      });
      return;
    }
    this.guardando = true;

    if (this.modalMode === 'crear') {
      const body: CrearActividadRequest = {
        activityDescription: this.formActividad.trim(),
        plannedStartDate: this.formPlannedStart || null,
        plannedEndDate: this.formPlannedEnd || null,
        progressPercentage: Number(this.formProgress) || 0,
      };
      this.service.crearActividad(this.selectedProyectoId, body).subscribe({
        next: () => { this.cerrarModal(); this.recargar(); },
        error: (err: HttpErrorResponse) => { this.guardando = false; this.errorService.handleError(err); },
      });
    } else {
      const body: EditarActividadRequest = {
        activityDescription: this.formActividad.trim(),
        plannedStartDate: this.formPlannedStart || null,
        plannedEndDate: this.formPlannedEnd || null,
        actualEndDate: this.formActualEnd || null,
        progressPercentage: Number(this.formProgress) || 0,
      };
      this.service.editarActividad(this.editandoId!, body).subscribe({
        next: () => { this.cerrarModal(); this.recargar(); },
        error: (err: HttpErrorResponse) => { this.guardando = false; this.errorService.handleError(err); },
      });
    }
  }

  culminarDesdeModal(): void {
    if (!this.editandoAct) return;
    const act = this.editandoAct;
    this.service.culminarActividad(act.projectActivityId).subscribe({
      next: (res) => {
        const idx = this.actividades.findIndex((a) => a.projectActivityId === act.projectActivityId);
        if (idx !== -1) this.actividades[idx].actualEndDate = res.actualEndDate;
        this.cerrarModal();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  eliminarDesdeModal(): void {
    if (!this.editandoAct) return;
    const act = this.editandoAct;
    Swal.fire({
      title: '¿Eliminar actividad?',
      text: act.activityDescription,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.service.eliminarActividad(act.projectActivityId).subscribe({
        next: () => {
          this.actividades = this.actividades.filter(
            (a) => a.projectActivityId !== act.projectActivityId,
          );
          this.buildParentIds();
          this.buildColorMap();
          this.cerrarModal();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  private recargar(): void {
    if (this.selectedProyectoId) this.loadActividades(this.selectedProyectoId);
  }

  // ── Modal Importar MPP ─────────────────────────────────────────────────────

  abrirModalMpp(): void {
    this.mppFile = null;
    this.importando = false;
    this.mppModalOpen = true;
  }

  cerrarModalMpp(): void {
    this.mppModalOpen = false;
    this.mppFile = null;
    this.importando = false;
  }

  onMppOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModalMpp();
    }
  }

  onMppFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mppFile = input.files?.[0] ?? null;
  }

  importarMpp(): void {
    if (!this.selectedProyectoId || !this.mppFile) return;

    const doImport = () => {
      this.importando = true;
      this.service.importarMpp(this.selectedProyectoId!, this.mppFile!).subscribe({
        next: () => {
          this.importando = false;
          this.cerrarModalMpp();
          this.recargar();
          Swal.fire({
            icon: 'success',
            title: 'Importación exitosa',
            text: 'Las actividades han sido importadas correctamente.',
            confirmButtonColor: '#2596be',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.importando = false;
          this.errorService.handleError(err);
        },
      });
    };

    if (this.actividades.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: '¿Estás seguro?',
        text: 'Esto reemplazará todas las actividades actuales del proyecto.',
        showCancelButton: true,
        confirmButtonText: 'Sí, importar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2596be',
        cancelButtonColor: '#9ca3af',
      }).then((result) => {
        if (result.isConfirmed) doImport();
      });
    } else {
      doImport();
    }
  }
}
