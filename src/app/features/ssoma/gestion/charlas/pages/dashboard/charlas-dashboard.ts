import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { CharlasService } from '../../services/charlas.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import {
  ProyectoInfo,
  Staff,
  CharlaResumen,
  Capacitacion,
  Resumen,
} from '../../dtos/charlas.dtos';

type Tab = 'asistencia' | 'capacitaciones';

@Component({
  selector: 'app-charlas-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './charlas-dashboard.html',
  styleUrl: './charlas-dashboard.css',
})
export class CharlasDashboard implements OnInit {
  tab: Tab = 'asistencia';
  loading = true;
  error = '';

  // proyecto
  proyectos: { id: number; nombre: string }[] = [];
  proyectoId: number | undefined;
  proyectoNombre = '';
  miProyectoId: number | undefined; // auto-detectado, puede ser undefined (admin)

  // período
  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  readonly anioActual = new Date().getFullYear();
  readonly meses = [
    { val: 1, label: 'Enero' }, { val: 2, label: 'Febrero' }, { val: 3, label: 'Marzo' },
    { val: 4, label: 'Abril' }, { val: 5, label: 'Mayo' }, { val: 6, label: 'Junio' },
    { val: 7, label: 'Julio' }, { val: 8, label: 'Agosto' }, { val: 9, label: 'Septiembre' },
    { val: 10, label: 'Octubre' }, { val: 11, label: 'Noviembre' }, { val: 12, label: 'Diciembre' },
  ];
  readonly anios = Array.from({ length: 4 }, (_, i) => this.anioActual - 1 + i);

  // KPIs
  resumen: Resumen | null = null;

  // Tab 1 — Asistencia
  charlas: CharlaResumen[] = [];
  staff: Staff[] = [];
  loadingCharlas = false;
  showFormCharla = false;
  nuevaFecha = '';
  nuevaTitulo = '';
  nuevaTema = '';
  nuevaDuracion = 1;
  charlaSeleccionada: CharlaResumen | null = null;
  asistenciaChecks: Record<number, boolean> = {};
  savingAsistencia = false;

  // Tab 2 — Capacitaciones
  capacitaciones: Capacitacion[] = [];
  loadingCaps = false;
  capSeleccionada: Capacitacion | null = null;
  capFecha = '';
  capTema = '';
  capFile: File | null = null;
  uploadingCap = false;

  constructor(
    private svc: CharlasService,
    private projectService: ProjectService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.loader.show();
    forkJoin({
      miProyecto: this.svc.getMiProyecto(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
    }).subscribe({
      next: ({ miProyecto, proyectos }) => {
        this.proyectos = proyectos.data.map((p: any) => ({
          id: p.projectId,
          nombre: p.projectDescription ?? p.name ?? '',
        }));
        if (miProyecto) {
          this.miProyectoId = miProyecto.proyectoId;
          this.proyectoId = miProyecto.proyectoId;
          this.proyectoNombre = miProyecto.nombre;
        }
        this.loading = false;
        this.loader.hide();
        if (this.proyectoId) this.cargarTodo();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onProyectoChange(): void {
    const p = this.proyectos.find((x) => x.id === Number(this.proyectoId));
    this.proyectoNombre = p?.nombre ?? '';
    if (this.proyectoId) this.cargarTodo();
  }

  setTab(t: Tab): void {
    this.tab = t;
    this.cdr.markForCheck();
  }

  reload(): void {
    if (this.proyectoId) this.cargarTodo();
  }

  private cargarTodo(): void {
    this.loadResumen();
    this.loadTab1();
    this.loadTab2();
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  loadResumen(): void {
    if (!this.proyectoId) return;
    this.svc.getResumen(this.proyectoId, this.mes, this.anio).subscribe({
      next: (r) => { this.resumen = r; this.cdr.markForCheck(); },
    });
  }

  // ── Tab 1 ─────────────────────────────────────────────────────────────────

  loadTab1(): void {
    if (!this.proyectoId) return;
    this.loadingCharlas = true;
    forkJoin({
      charlas: this.svc.getCharlas(this.proyectoId, this.mes, this.anio),
      staff: this.svc.getStaff(this.proyectoId),
    }).subscribe({
      next: ({ charlas, staff }) => {
        this.charlas = charlas;
        this.staff = staff;
        this.loadingCharlas = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCharlas = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  submitCharla(): void {
    if (!this.proyectoId || !this.nuevaFecha || !this.nuevaTitulo || !this.nuevaTema) return;
    this.loader.show();
    this.svc.crearCharla({
      fecha: this.nuevaFecha, titulo: this.nuevaTitulo,
      tema: this.nuevaTema, duracionHoras: this.nuevaDuracion, proyectoId: this.proyectoId,
    }).subscribe({
      next: (c) => {
        this.charlas = [...this.charlas, c].sort((a, b) => a.fecha.localeCompare(b.fecha));
        this.showFormCharla = false;
        this.nuevaFecha = ''; this.nuevaTitulo = ''; this.nuevaTema = ''; this.nuevaDuracion = 1;
        this.loader.hide(); this.loadResumen(); this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck();
      },
    });
  }

  eliminarCharla(charla: CharlaResumen): void {
    Swal.fire({ title: '¿Eliminar charla?', text: charla.titulo, icon: 'question',
      showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loader.show();
      this.svc.eliminarCharla(charla.id).subscribe({
        next: () => {
          this.charlas = this.charlas.filter((c) => c.id !== charla.id);
          this.loader.hide(); this.loadResumen(); this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck();
        },
      });
    });
  }

  abrirAsistencia(charla: CharlaResumen): void {
    this.charlaSeleccionada = charla;
    this.asistenciaChecks = {};
    for (const w of this.staff) {
      this.asistenciaChecks[w.workerId] = charla.asistentesIds.includes(w.workerId);
    }
    this.cdr.markForCheck();
  }

  cerrarAsistencia(): void { this.charlaSeleccionada = null; this.cdr.markForCheck(); }

  guardarAsistencia(): void {
    if (!this.charlaSeleccionada) return;
    const workerIds = Object.entries(this.asistenciaChecks)
      .filter(([, v]) => v).map(([k]) => Number(k));
    this.savingAsistencia = true;
    this.svc.guardarAsistencia(this.charlaSeleccionada.id, { workerIds }).subscribe({
      next: () => {
        const c = this.charlas.find((x) => x.id === this.charlaSeleccionada!.id);
        if (c) { c.asistentesIds = workerIds; c.totalAsistentes = workerIds.length; }
        this.savingAsistencia = false; this.charlaSeleccionada = null;
        this.loadResumen(); this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.savingAsistencia = false; this.errorService.handleError(err); this.cdr.markForCheck();
      },
    });
  }

  // ── Tab 2 ─────────────────────────────────────────────────────────────────

  loadTab2(): void {
    if (!this.proyectoId) return;
    this.loadingCaps = true;
    this.svc.getCapacitaciones(this.proyectoId, this.mes, this.anio).subscribe({
      next: (data) => { this.capacitaciones = data; this.loadingCaps = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => {
        this.loadingCaps = false; this.errorService.handleError(err); this.cdr.markForCheck();
      },
    });
  }

  abrirUpload(cap: Capacitacion): void {
    this.capSeleccionada = cap;
    this.capFecha = cap.fecha ? cap.fecha.split('T')[0] : new Date().toISOString().split('T')[0];
    this.capTema = cap.tema ?? '';
    this.capFile = null;
    this.cdr.markForCheck();
  }

  cerrarUpload(): void { this.capSeleccionada = null; this.cdr.markForCheck(); }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.capFile = input.files?.[0] ?? null;
  }

  subirCapacitacion(): void {
    if (!this.capSeleccionada || !this.capFile || !this.capFecha || !this.capTema) return;
    this.uploadingCap = true;
    this.svc.subirCapacitacion(this.capSeleccionada.workerId, this.capFecha, this.capTema, this.capFile).subscribe({
      next: (updated) => {
        this.capacitaciones = this.capacitaciones.map((c) =>
          c.workerId === updated.workerId ? updated : c,
        );
        this.uploadingCap = false; this.capSeleccionada = null;
        this.loadResumen(); this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingCap = false; this.errorService.handleError(err); this.cdr.markForCheck();
      },
    });
  }

  aprobar(cap: Capacitacion): void {
    if (!cap.id) return;
    this.loader.show();
    this.svc.cambiarEstado(cap.id, 'Aprobado').subscribe({
      next: (updated) => {
        this.capacitaciones = this.capacitaciones.map((c) =>
          c.workerId === updated.workerId ? updated : c,
        );
        this.loader.hide(); this.loadResumen(); this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck();
      },
    });
  }

  rechazar(cap: Capacitacion): void {
    if (!cap.id) return;
    this.loader.show();
    this.svc.cambiarEstado(cap.id, 'Rechazado').subscribe({
      next: (updated) => {
        this.capacitaciones = this.capacitaciones.map((c) =>
          c.workerId === updated.workerId ? updated : c,
        );
        this.loader.hide(); this.loadResumen(); this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatFecha(fecha: string | null): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'Aprobado': return 'badge--verde';
      case 'Rechazado': return 'badge--rojo';
      case 'Enviado': return 'badge--azul';
      default: return 'badge--gris';
    }
  }

  mesLabel(): string {
    return this.meses.find((m) => m.val === this.mes)?.label ?? '';
  }

  get esAdmin(): boolean {
    return !this.miProyectoId;
  }
}
