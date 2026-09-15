import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  DashboardPresupuestoDto,
  DashboardAcumuladoDto,
  DashboardLineaDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

type DashboardVista = 'proyecto' | 'acumulado';

/** Circunferencia del gauge: 2 * PI * 40 (radio 40 del SVG) — mismo mecanismo que los gauges
 * circulares de Indicadores Proactivos, para que ambos dashboards se vean con el mismo lenguaje
 * visual. */
const CIRCUNFERENCIA_GAUGE = 251.2;

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc = inject(PresupuestoMaterialesService);
  private error = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);

  vista: DashboardVista = 'proyecto';

  // ── Por proyecto ─────────────────────────────────────────────────────────
  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;
  dashboard: DashboardPresupuestoDto | null = null;
  loadingDashboard = false;
  sinPresupuesto = false;

  // ── Acumulado (todos los proyectos) ─────────────────────────────────────
  acumulado: DashboardAcumuladoDto | null = null;
  loadingAcumulado = false;

  ngOnInit(): void {
    this.loadProyectos();
  }

  cambiarVista(v: DashboardVista): void {
    this.vista = v;
    if (v === 'acumulado' && !this.acumulado) this.loadAcumulado();
    this.cdr.markForCheck();
  }

  private loadProyectos(): void {
    this.svc.getDrivers().subscribe({
      next: (drivers) => {
        this.proyectos = drivers
          .map((d) => ({ projectId: d.projectId, projectDescription: d.projectDescription }))
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.cdr.markForCheck();
        this.preseleccionarProyectoActual();
      },
      error: () => {},
    });
  }

  /** Preselecciona la obra donde el usuario está vinculado como trabajador; si no tiene
   * vinculación activa (personal de oficina/gerencia), cae al último proyecto que haya elegido
   * a mano en cualquier pantalla del módulo — así el dashboard casi nunca abre vacío. */
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
    this.dashboard = null;
    this.sinPresupuesto = false;
    if (!this.proyectoId) { this.cdr.markForCheck(); return; }
    this.svc.setUltimoProyectoId(this.proyectoId);
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
        this.sinPresupuesto = true;
        this.loadingDashboard = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadAcumulado(): void {
    this.loadingAcumulado = true;
    this.cdr.markForCheck();
    this.svc.getDashboardAcumulado().subscribe({
      next: (a) => {
        this.acumulado = a;
        this.loadingAcumulado = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingAcumulado = false;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Gauge circular (mismo mecanismo SVG que Indicadores Proactivos) ──────

  gaugeOffset(pct: number): number {
    return CIRCUNFERENCIA_GAUGE * (1 - Math.min(pct / 100, 1));
  }

  /** Escala de color inversa a la de un puntaje de desempeño: acá más consumo es peor, no mejor.
   * Paleta UDP exacta (DESIGN-VICTOR.md §6.4). */
  gaugeColorPresupuesto(pct: number): string {
    if (pct >= 100) return '#C0392B';
    if (pct >= 80) return '#D97706';
    return '#1B6B3A';
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

  tipoSemaforo(pct: number): string {
    if (pct >= 100) return 'ALERTA';
    if (pct >= 80) return 'ADVERTENCIA';
    return 'OK';
  }

  /** Familias a destacar: lo fuera de presupuesto primero, luego alertas y advertencias — lo que
   * está OK no aporta nada a un vistazo gerencial. */
  get familiasDestacadas(): DashboardLineaDto[] {
    if (!this.dashboard) return [];
    return this.dashboard.tipos
      .flatMap((t) => t.familias)
      .filter((f) => f.semaforo !== 'OK' && f.semaforo !== 'SIN_PRESUPUESTO')
      .sort((a, b) => (b.fueraDePresupuesto ? 1 : 0) - (a.fueraDePresupuesto ? 1 : 0) || b.pctConsumido - a.pctConsumido);
  }
}
