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

  // Modal
  modalOpen = false;
  modalMode: 'crear' | 'editar' = 'crear';
  editandoId: number | null = null;

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
  ) {}

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
    if (!id) return;
    this.loadActividades(id);
  }

  private loadActividades(proyectoId: number): void {
    this.loadingActividades = true;
    this.loaderService.show();
    this.service.getActividades(proyectoId).subscribe({
      next: (res) => {
        this.actividades = res ?? [];
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

  culminar(act: ActividadDto): void {
    this.service.culminarActividad(act.projectActivityId).subscribe({
      next: (res) => {
        act.actualEndDate = res.actualEndDate;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  eliminar(act: ActividadDto): void {
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
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  private recargar(): void {
    if (this.selectedProyectoId) this.loadActividades(this.selectedProyectoId);
  }
}
