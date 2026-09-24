import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { gantt } from 'dhtmlx-gantt';
import { CronogramaDashboardService } from './services/cronograma-dashboard.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../shared/utils/client-pager';
import {
  CronogramaDashboardKpisDto,
  CronogramaDashboardProyectoDto,
  CronogramaDashboardResponsableDto,
  RankingResponsableDto,
  HeatmapResponsableDto,
  ProyectoDetalleDto,
} from './dtos/cronograma-dashboard.dtos';

@Component({
  selector: 'app-cronograma-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchSelect,
    Paginator,
  ],
  templateUrl: './cronograma-dashboard.html',
  styleUrl: './cronograma-dashboard.css',
})
export class CronogramaDashboard implements OnInit {
  @ViewChild('ganttPanel') ganttPanelRef?: ElementRef<HTMLDivElement>;

  loading = false;
  errorMsg = '';

  kpis: CronogramaDashboardKpisDto | null = null;
  proyectos: CronogramaDashboardProyectoDto[] = [];
  responsables: CronogramaDashboardResponsableDto[] = [];

  selectedResponsableId: number | null = null;
  selectedEstado = '';
  spiPromedio = 1.0;
  filtrosAbiertos = false;

  // ── Ranking + Heatmap (migrados de projects-dashboard) ───────────────────
  rankingHeatmapLoading = false;
  rankingResponsables: RankingResponsableDto[] = [];
  heatmapCarga: HeatmapResponsableDto[] = [];

  // ── Panel lateral de Gantt (migrado de projects-dashboard) ───────────────
  panelOpen = false;
  panelLoading = false;
  selectedProyectoGantt: CronogramaDashboardProyectoDto | null = null;
  detalle: ProyectoDetalleDto | null = null;
  activeTab: 'gantt' | 'actividades' = 'gantt';
  private ganttInitialized = false;

  private readonly pager = new ClientPager<CronogramaDashboardProyectoDto>();

  anioActual = new Date().getFullYear();
  readonly fechaActual = new Date();

  constructor(
    private service: CronogramaDashboardService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadRankingYHeatmap();
  }

  get responsableOptions(): { userId: number | null; nombreCompleto: string }[] {
    return [{ userId: null, nombreCompleto: 'Todos' }, ...this.responsables];
  }

  readonly estadoOptions: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'AL_DIA', label: 'Al día' },
    { value: 'CON_RETRASO', label: 'Con retraso' },
    { value: 'SIN_ACTIVIDADES', label: 'Sin actividades' },
  ];

  get filtrosActivos(): number {
    let n = 0;
    if (this.selectedResponsableId !== null) n++;
    if (this.selectedEstado) n++;
    return n;
  }

  onFilterChange(): void {
    this.pager.reset();
    this.loadDashboard();
  }

  limpiarFiltros(): void {
    this.selectedResponsableId = null;
    this.selectedEstado = '';
    this.onFilterChange();
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.proyectos);
  }

  get pageSize(): number {
    return this.pager.pageSize;
  }

  get pagedProyectos(): CronogramaDashboardProyectoDto[] {
    return this.pager.page(this.proyectos);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  semaforoLabel(semaforo: string, estado: string): string {
    if (estado === 'SIN_ACTIVIDADES') return 'Sin actividades registradas';
    if (semaforo === 'VERDE') return 'Semáforo verde: cronograma al día';
    if (semaforo === 'AMARILLO') return 'Semáforo amarillo: alerta de retraso';
    if (semaforo === 'ROJO') return 'Semáforo rojo: retraso crítico';
    return 'Sin información de semáforo';
  }

  irAlCronograma(): void {
    this.router.navigate(['/projects/cronograma-actividades']);
  }

  irAProyecto(projectId: number): void {
    this.router.navigate(['/projects/cronograma-actividades', projectId]);
  }

  avanceBarColor(avance: number, estado: string): string {
    if (estado === 'SIN_ACTIVIDADES') return '#E2E8F0';
    if (avance >= 75) return '#1B6B3A';
    if (avance >= 50) return '#2E6DB4';
    if (avance >= 25) return '#D97706';
    return '#C0392B';
  }

  spiColor(spi: number, estado: string): string {
    if (estado === 'SIN_ACTIVIDADES') return '#94A3B8';
    if (spi >= 1) return '#1B6B3A';
    if (spi >= 0.9) return '#D97706';
    return '#C0392B';
  }

  spiLabel(spi: number, estado: string): string {
    if (estado === 'SIN_ACTIVIDADES') return '—';
    return spi.toFixed(2);
  }

  // ── Heatmap "Carga por Responsable y Semana" (migrado de projects-dashboard) ──

  get heatmapSemanas(): string[] {
    return this.heatmapCarga[0]?.semanas?.map((s) => s.semana) ?? [];
  }

  get heatmapMax(): number {
    if (!this.heatmapCarga.length) return 1;
    let max = 0;
    for (const row of this.heatmapCarga) {
      for (const s of row.semanas ?? []) {
        if (s.cantidad > max) max = s.cantidad;
      }
    }
    return max || 1;
  }

  heatmapCellBg(cantidad: number): string {
    if (!cantidad) return '#f1f5f9';
    const t = Math.min(1, cantidad / this.heatmapMax);
    const r = Math.round(255 + (46 - 255) * t);
    const g = Math.round(255 + (109 - 255) * t);
    const b = Math.round(255 + (180 - 255) * t);
    return `rgb(${r},${g},${b})`;
  }

  heatmapCellFg(cantidad: number): string {
    return Math.min(1, cantidad / this.heatmapMax) > 0.52 ? '#ffffff' : '#374151';
  }

  /**
   * Ranking + Heatmap vienen de GET api/v1/projects-dashboard, endpoint distinto del
   * dashboard propio de esta página (GET api/v1/cronograma-actividades/dashboard) — es una 2da
   * llamada HTTP en ngOnInit, violación conocida y documentada de la regla "1 acción = 1 HTTP"
   * (ver memoria arch-1-accion-1-http). Se aceptó como trade-off porque mover esta lógica al
   * backend de cronograma-actividades queda fuera de esta sesión (repo separado); si se retoma,
   * la corrección es que `cronograma-actividades/dashboard` devuelva también `rankingResponsables`/
   * `heatmapCarga` reusando `ProjectsDashboardRepository.BuildRanking`/`BuildHeatmap`. No se piden
   * ni se refiltran con `selectedResponsableId`/`selectedEstado` de esta página a propósito: son
   * vistas agregadas de comparación entre responsables — filtrarlas por un solo responsable las
   * vaciaría de sentido — por eso se cargan una sola vez, no en cada `onFilterChange()`.
   */
  private loadRankingYHeatmap(): void {
    this.rankingHeatmapLoading = true;
    this.service.getRankingYHeatmap().subscribe({
      next: (res) => {
        this.rankingResponsables = res.rankingResponsables ?? [];
        this.heatmapCarga = res.heatmapCarga ?? [];
        this.rankingHeatmapLoading = false;
      },
      error: () => {
        // No bloquea el resto del dashboard si este endpoint falla.
        this.rankingHeatmapLoading = false;
      },
    });
  }

  // ── Panel lateral de Gantt por proyecto (migrado de projects-dashboard) ──────

  abrirGantt(proyecto: CronogramaDashboardProyectoDto): void {
    this.selectedProyectoGantt = proyecto;
    this.panelOpen = true;
    this.panelLoading = true;
    this.detalle = null;
    this.activeTab = 'gantt';
    this.ganttInitialized = false;

    this.service.getProyectoDetalle(proyecto.projectId).subscribe({
      next: (detalle) => {
        this.detalle = detalle;
        this.panelLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initGantt(), 200);
      },
      error: (err: HttpErrorResponse) => {
        this.panelLoading = false;
        this.errorService.handleError(err);
      },
    });
  }

  closePanel(): void {
    this.panelOpen = false;
    this.selectedProyectoGantt = null;
    this.detalle = null;
    this.ganttInitialized = false;
  }

  panelSemaforoLabel(semaforo: string | undefined): string {
    if (semaforo === 'amarillo') return 'En riesgo';
    if (semaforo === 'rojo') return 'Retrasado';
    return 'En tiempo';
  }

  chipBySemaforo(semaforo: string | undefined): string {
    if (semaforo === 'rojo') return 'chip-red';
    if (semaforo === 'amarillo') return 'chip-orange';
    return 'chip-green';
  }

  private initGantt(): void {
    const el = this.ganttPanelRef?.nativeElement;
    if (!el || !this.detalle?.gantt) return;
    try {
      gantt.clearAll();
      if (this.ganttInitialized) {
        gantt.destructor();
        this.ganttInitialized = false;
      }
      gantt.config.date_format = '%d-%m-%Y %H:%i';
      gantt.config.readonly = true;
      gantt.config.fit_tasks = true;
      gantt.config['scale_unit'] = 'day';
      gantt.config['date_scale'] = '%d %M';
      gantt.config.min_column_width = 60;
      gantt.config.row_height = 34;
      gantt.config.bar_height = 20;
      gantt.config.show_grid = true;
      gantt.config.grid_width = 200;
      gantt.config.columns = [
        { name: 'text', label: 'Actividad', width: 180, tree: true },
        { name: 'duration', label: 'Días', width: 40, align: 'center' },
      ];
      gantt.templates.task_class = (start: Date, end: Date, task: any) => {
        if (task.progress >= 1) return 'gantt-culminado';
        if (end < new Date()) return 'gantt-vencido';
        if (start <= new Date()) return 'gantt-en-proceso';
        return 'gantt-pendiente';
      };
      gantt.templates.task_text = (_start: Date, _end: Date, task: any) => task.text;
      gantt.init(el);
      this.ganttInitialized = true;
      gantt.parse({
        data: this.detalle.gantt.tasks,
        links: this.detalle.gantt.links ?? [],
      });
    } catch (e) {
      console.warn('[Dashboard UDP · Gantt]', e);
    }
  }

  private loadDashboard(): void {
    this.loading = true;
    this.errorMsg = '';
    this.loaderService.show();
    const filters: { responsableId?: number; estado?: string } = {};
    if (this.selectedResponsableId != null) filters.responsableId = this.selectedResponsableId;
    if (this.selectedEstado) filters.estado = this.selectedEstado;

    this.service.getDashboard(filters).subscribe({
      next: (res) => {
        this.kpis = res.kpis;
        this.proyectos = res.proyectos;
        const conActs = res.proyectos.filter(p => p.estado !== 'SIN_ACTIVIDADES');
        this.spiPromedio = conActs.length > 0
          ? Math.round((conActs.reduce((sum, p) => sum + p.spi, 0) / conActs.length) * 100) / 100
          : 1.0;
        this.responsables = res.responsables;
        this.pager.reset();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMsg = 'No se pudo cargar el dashboard. Intente nuevamente.';
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
