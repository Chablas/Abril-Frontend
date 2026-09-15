import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import {
  ConsumoCargaResumenDto,
  ImportConsumoResultDto,
  HhCargaResumenDto,
  ImportHhResultDto,
  DashboardPresupuestoDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

@Component({
  selector: 'app-presupuesto-main',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AbrilPageHeaderComponent, SearchSelect, BaseModal],
  templateUrl: './presupuesto-main.html',
  styleUrl: './presupuesto-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresupuestoMainComponent implements OnInit, OnDestroy {
  private svc = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);

  readonly headerTabs = PRESUPUESTO_TABS;

  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  // Cargas S10 (materiales)
  cargas: ConsumoCargaResumenDto[] = [];
  loadingCargas = false;
  subiendoArchivo = false;
  uploadResult: ImportConsumoResultDto | null = null;
  archivoSeleccionado: File | null = null;
  estandarizandoId: number | null = null;
  progresoEstandarizacion: { procesadas: number; total: number } | null = null;
  private pollProgreso: ReturnType<typeof setInterval> | null = null;

  // Cargas de Horas Hombre (planilla/Tareo semanal)
  cargasHh: HhCargaResumenDto[] = [];
  loadingCargasHh = false;
  subiendoArchivoHh = false;
  uploadResultHh: ImportHhResultDto | null = null;
  archivoSeleccionadoHh: File | null = null;

  // Modales de subida (antes inline, ahora en modal para dejar espacio al comparativo)
  mostrarModalKardex = false;
  mostrarModalHh = false;

  // Comparativo presupuestado vs real (Kardex)
  dashboard: DashboardPresupuestoDto | null = null;
  loadingDashboard = false;

  ngOnInit(): void {
    this.loadProyectos();
  }

  ngOnDestroy(): void {
    this.detenerPollProgreso();
  }

  /** Todos los proyectos, no solo los "habilitados" (activos) — un proyecto Finalizado/Inactivo
   * también necesita subir aquí su Excel de HH/materiales, aunque ya no aparezca en el filtro
   * de habilitados de otras pantallas. */
  private loadProyectos(): void {
    this.proyectoHabilitadoSvc.getTodos().subscribe({
      next: (res) => {
        this.proyectos = res
          .map((p) => ({ projectId: p.proyectoId, projectDescription: p.proyectoDescription }))
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.cdr.markForCheck();
        this.preseleccionarProyectoActual();
      },
      error: () => {},
    });
  }

  /** Preselecciona la obra donde el usuario está vinculado como trabajador; si no tiene
   * vinculación activa (personal de oficina/gerencia), cae al último proyecto elegido a mano en
   * cualquier pantalla del módulo, para no obligarlo a buscarlo cada vez. */
  private preseleccionarProyectoActual(): void {
    this.svc.getProyectoActual().subscribe({
      next: ({ projectId }) => this.aplicarProyectoPreseleccionado(projectId ?? this.svc.getUltimoProyectoId()),
      error: () => this.aplicarProyectoPreseleccionado(this.svc.getUltimoProyectoId()),
    });
  }

  private aplicarProyectoPreseleccionado(id: number | null): void {
    if (!id || this.proyectoId) return;
    if (!this.proyectos.some((p) => p.projectId === id)) return;
    this.proyectoId = id;
    this.onProyectoChange();
  }

  onProyectoChange(): void {
    this.cargas = [];
    this.uploadResult = null;
    this.cargasHh = [];
    this.uploadResultHh = null;
    this.dashboard = null;
    if (!this.proyectoId) { this.cdr.markForCheck(); return; }
    this.svc.setUltimoProyectoId(this.proyectoId);
    this.loadCargas();
    this.loadCargasHh();
    this.loadDashboard();
  }

  // ─── Comparativo presupuestado vs real ──────────────────────────────────

  loadDashboard(): void {
    if (!this.proyectoId) return;
    this.loadingDashboard = true;
    this.cdr.markForCheck();
    this.svc.getDashboardPorProyecto(this.proyectoId).subscribe({
      next: (d) => {
        this.dashboard = d;
        this.loadingDashboard = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // 404 = todavía no se generó presupuesto para este proyecto; no es un error a mostrar.
        this.dashboard = null;
        this.loadingDashboard = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Cargas de materiales (S10) ─────────────────────────────────────────

  loadCargas(): void {
    if (!this.proyectoId) return;
    this.loadingCargas = true;
    this.cdr.markForCheck();
    this.svc.listarCargas(this.proyectoId).subscribe({
      next: (c) => {
        this.cargas = c;
        this.loadingCargas = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCargas = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado = input.files?.[0] ?? null;
    this.uploadResult = null;
    this.cdr.markForCheck();
  }

  subirS10(): void {
    if (!this.proyectoId || !this.archivoSeleccionado || this.subiendoArchivo) return;
    this.subiendoArchivo = true;
    this.uploadResult = null;
    this.cdr.markForCheck();
    this.svc.importarS10(this.proyectoId, this.archivoSeleccionado).subscribe({
      next: (res) => {
        this.uploadResult = res;
        this.subiendoArchivo = false;
        this.archivoSeleccionado = null;
        this.loadCargas();
        this.loadDashboard();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoArchivo = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Modales de subida ────────────────────────────────────────────────────

  abrirModalKardex(): void {
    this.uploadResult = null;
    this.archivoSeleccionado = null;
    this.mostrarModalKardex = true;
    this.cdr.markForCheck();
  }

  cerrarModalKardex(): void {
    if (this.subiendoArchivo) return;
    this.mostrarModalKardex = false;
    this.cdr.markForCheck();
  }

  abrirModalHh(): void {
    this.uploadResultHh = null;
    this.archivoSeleccionadoHh = null;
    this.mostrarModalHh = true;
    this.cdr.markForCheck();
  }

  cerrarModalHh(): void {
    if (this.subiendoArchivoHh) return;
    this.mostrarModalHh = false;
    this.cdr.markForCheck();
  }

  estandarizar(cargaId: number): void {
    if (this.estandarizandoId === cargaId) return;
    this.estandarizandoId = cargaId;
    this.progresoEstandarizacion = null;
    this.cdr.markForCheck();
    this.iniciarPollProgreso(cargaId);
    this.svc.estandarizar(cargaId).subscribe({
      next: () => {
        this.detenerPollProgreso();
        this.estandarizandoId = null;
        this.progresoEstandarizacion = null;
        this.loadCargas();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.detenerPollProgreso();
        this.estandarizandoId = null;
        this.progresoEstandarizacion = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Consulta el progreso cada 1.5s mientras dura la estandarización — puede tardar varios minutos
   * en lotes grandes (miles de líneas), y sin esto la pantalla se queda "Procesando..." sin más info. */
  private iniciarPollProgreso(cargaId: number): void {
    this.pollProgreso = setInterval(() => {
      this.svc.obtenerProgresoEstandarizacion(cargaId).subscribe({
        next: (p) => {
          this.progresoEstandarizacion = p.enProceso && p.total ? { procesadas: p.procesadas ?? 0, total: p.total } : null;
          this.cdr.markForCheck();
        },
        error: () => {},
      });
    }, 1500);
  }

  private detenerPollProgreso(): void {
    if (this.pollProgreso) {
      clearInterval(this.pollProgreso);
      this.pollProgreso = null;
    }
  }

  // ─── Cargas de Horas Hombre ──────────────────────────────────────────────

  loadCargasHh(): void {
    if (!this.proyectoId) return;
    this.loadingCargasHh = true;
    this.cdr.markForCheck();
    this.svc.listarCargasHh(this.proyectoId).subscribe({
      next: (c) => {
        this.cargasHh = c;
        this.loadingCargasHh = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCargasHh = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onArchivoChangeHh(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionadoHh = input.files?.[0] ?? null;
    this.uploadResultHh = null;
    this.cdr.markForCheck();
  }

  subirHh(): void {
    if (!this.proyectoId || !this.archivoSeleccionadoHh || this.subiendoArchivoHh) return;
    this.subiendoArchivoHh = true;
    this.uploadResultHh = null;
    this.cdr.markForCheck();
    this.svc.importarHh(this.proyectoId, this.archivoSeleccionadoHh).subscribe({
      next: (res) => {
        this.uploadResultHh = res;
        this.subiendoArchivoHh = false;
        this.archivoSeleccionadoHh = null;
        this.loadCargasHh();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoArchivoHh = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  estadoCargaClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'completado': return 'pres-badge--ok';
      case 'pendiente_revision': return 'pres-badge--warn';
      default: return 'pres-badge--neutral';
    }
  }

  semaforoClass(semaforo: string): string {
    switch (semaforo) {
      case 'ALERTA': return 'sem--alerta';
      case 'ADVERTENCIA': return 'sem--advertencia';
      case 'FUERA_DE_PRESUPUESTO': return 'sem--fuera';
      case 'SIN_PRESUPUESTO': return 'sem--neutral';
      default: return 'sem--ok';
    }
  }

  semaforoLabel(semaforo: string): string {
    switch (semaforo) {
      case 'ALERTA': return 'Superado';
      case 'ADVERTENCIA': return 'Por agotarse';
      case 'FUERA_DE_PRESUPUESTO': return 'Fuera de presupuesto';
      case 'SIN_PRESUPUESTO': return 'Sin presupuesto';
      default: return 'Dentro de lo esperado';
    }
  }

  /** Familias a mostrar en la card gerencial: primero lo fuera de presupuesto, luego alertas y
   * advertencias — lo que está OK no aporta nada a un vistazo gerencial y se omite. */
  get familiasDestacadas() {
    if (!this.dashboard) return [];
    return this.dashboard.tipos
      .flatMap((t) => t.familias)
      .filter((f) => f.semaforo !== 'OK' && f.semaforo !== 'SIN_PRESUPUESTO')
      .sort((a, b) => (b.fueraDePresupuesto ? 1 : 0) - (a.fueraDePresupuesto ? 1 : 0) || b.pctConsumido - a.pctConsumido);
  }
}
