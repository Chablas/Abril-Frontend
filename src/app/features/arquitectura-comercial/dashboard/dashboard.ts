import {
  Component, AfterViewInit, ChangeDetectorRef,
  ElementRef, ViewChild, OnDestroy,
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels    from 'chartjs-plugin-datalabels';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of }   from 'rxjs';
import { catchError }     from 'rxjs/operators';
import { Router }        from '@angular/router';
import Swal              from 'sweetalert2';
import { ArquitecturaComercialService } from '../../../core/services/arquitectura-comercial.service';
import { ErrorService }   from '../../../core/services/error.service';
import {
  ArqComercialDashboardDTO,
  ArqComercialKpiDTO,
  ArqComercialAlertDTO,
  ChartItemDTO,
  SupervisorProgresoDTO,
  HitoCriticoDTO,
  TareasPorArquitectoDTO,
  ProximoPorProyectoDTO,
  EficienciaConsultaSemanalDTO,
  GanttMiniItemDTO,
  CategoriaItemDTO,
  CategoriaDashboardItemDTO,
  SemanaDashboardDTO,
  SupervisorHistoricoDTO,
  CargaSemanalDTO,
} from '../../../core/dtos/arquitectura-comercial/arquitectura-comercial-dashboard.model';
import {
  ActividadListItemDTO,
} from '../../../core/dtos/arquitectura-comercial/actividades.model';
import {
  ActividadAlertaDTO,
  DashboardFiltroDTO,
  EnviarAlertaRequestDTO,
} from '../../../core/dtos/arquitectura-comercial/arquitectura-comercial-alert.model';

import { AC_TABS } from '../shared/arquitectura-comercial-tabs';
Chart.register(...registerables, ChartDataLabels);

// ─── tipos locales ───────────────────────────────────────────────
type TipoAlerta = 'VENCIDA' | 'VENCE_SEMANA' | 'ARRANQUE' | 'HITO_PROXIMO';
type TabHito    = 'INICIAR' | 'VENCER' | 'VENCIDOS';

@Component({
  selector   : 'app-arq-comercial-dashboard',
  standalone : true,
  imports    : [CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect],
  templateUrl: './dashboard.html',
  styleUrl   : './dashboard.css',
})
export class Dashboard implements AfterViewInit, OnDestroy {
  readonly tabs = AC_TABS;

  anioActual = new Date().getFullYear();

  // ─── estado global ──────────────────────────────────────────────
  loader = true;
  enviandoAlerta = false;

  // ─── categoría activa (pill principal) ─────────────────────────
  categoriaActiva: number | null = null;   // null = TODOS

  // Desactivado temporalmente a pedido — el bloque queda en el código por si se reactiva.
  mostrarPartidasControl = false;

  // ─── filtros secundarios ────────────────────────────────────────
  filtro: DashboardFiltroDTO = {
    categoriaId : null,
    proyectoId  : null,
    userId      : null,
    semana      : null,
    mes         : null,
    anio        : null,
  };
  filtrosAbiertos = false;

  get filtrosActivos(): number {
    return [this.filtro.userId, this.filtro.semana, this.filtro.mes, this.filtro.proyectoId]
      .filter((v) => v !== null && v !== undefined).length;
  }

  limpiarFiltros(): void {
    this.filtro.userId = null;
    this.filtro.semana = null;
    this.filtro.mes = null;
    this.filtro.proyectoId = null;
    this.buscar();
  }

  // ─── datos del dashboard ────────────────────────────────────────
  kpis: ArqComercialKpiDTO = {
    totalActividades: 0, culminadas: 0, enProceso: 0,
    vencidas: 0, pendientes: 0, eficienciaMedia: 0, progresoGlobal: 0,
  };
  alertas: ArqComercialAlertDTO = {
    vencidasSinCerrar: 0, vencenEstaSemana: 0,
    arrancanEstaSemana: 0, hitosProximos14Dias: 0,
  };
  supervisores            : SupervisorProgresoDTO[]     = [];
  hitosCriticos           : HitoCriticoDTO[]            = [];
  tareasPorArquitecto     : TareasPorArquitectoDTO[]    = [];
  proximosPorProyecto     : ProximoPorProyectoDTO[]     = [];
  eficienciaConsultas     : EficienciaConsultaSemanalDTO[] = [];
  ganttHitos              : GanttMiniItemDTO[]          = [];
  ganttEntregables        : GanttMiniItemDTO[]          = [];
  categorias              : CategoriaItemDTO[]          = [];
  distribucionPorCategoria: CategoriaDashboardItemDTO[] = [];
  semanaActual            : SemanaDashboardDTO | null   = null;
  rangoUltimasSemanas     = '';

  // ─── catálogos para filtros ────────────────────────────────────
  proyectos  : { id: number; nombre: string }[]     = [];
  arquitectos: { id: number; nombre: string }[]     = [];
  semanas    : { value: number; label: string }[]   = [];
  meses      : { value: number; label: string }[]   = [];

  // ─── modal de alertas ──────────────────────────────────────────
  modalAlertaVisible    = false;
  modalAlertaTitulo     = '';
  modalAlertaTipo       : TipoAlerta | null = null;
  modalAlertaActividades: ActividadAlertaDTO[] = [];
  modalAlertaLoading    = false;
  seleccionados         = new Set<number>();

  // ─── modal actividades trabajador ──────────────────────────────
  modalCargaVisible            = false;
  modalCargaNombre             = '';
  modalCargaLoading            = false;
  modalCargaActividades        : ActividadListItemDTO[] = [];
  modalCargaExcluirCulminadas  = true;
  modalCargaFiltroEstado       = '';
  modalCargaFiltroTipo         = '';
  modalCargaSoloSemanaControl  = false;
  modalCargaStats              = { hitos: 0, entregables: 0, consultas: 0, culminadas: 0, vencidas: 0 };
  readonly modalCargaEstadoOptions = [
    { value: 'EN_PROCESO', label: 'En proceso' },
    { value: 'EN_RIESGO', label: 'En riesgo' },
    { value: 'VENCIDO', label: 'Vencido' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'CULMINADO', label: 'Culminado' },
  ];

  toggleModalCargaFiltroEstado(estado: string): void {
    this.modalCargaFiltroEstado = this.modalCargaFiltroEstado === estado ? '' : estado;
  }

  toggleModalCargaFiltroTipo(tipo: string): void {
    this.modalCargaFiltroTipo = this.modalCargaFiltroTipo === tipo ? '' : tipo;
  }

  private hoy(): Date { const d = new Date(); d.setHours(0,0,0,0); return d; }
  private pd(iso: string): Date { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); }
  /** Parsea "dd/MM/yyyy" (formato de SemanaDashboardDTO.inicio/fin) a Date local. */
  private pdSlash(ddmmyyyy: string): Date {
    const [d, m, y] = ddmmyyyy.split('/').map(Number);
    return new Date(y, m - 1, d);
  }

  /** Rango [lunes, domingo] de la semana en control que usa el IES del ranking
   * (misma semana que el backend usa en GetDashboardDataFiltrado). */
  private semanaControlBounds(): { inicio: Date; fin: Date } | null {
    if (!this.semanaActual) return null;
    return { inicio: this.pdSlash(this.semanaActual.inicio), fin: this.pdSlash(this.semanaActual.fin) };
  }

  estadoGantt(a: ActividadListItemDTO): 'CULMINADO'|'EN_PROCESO'|'VENCIDO'|'EN_RIESGO'|'PENDIENTE' {
    const hoy = this.hoy();
    if (a.finEfectivo)  return 'CULMINADO';
    // VENCIDO se evalúa antes que EN_PROCESO: una actividad que ya arrancó pero se pasó
    // de su fecha fin programada sigue estando vencida, no "en proceso" (así la clasifica
    // el backend en ComputeEstado — mismo orden, para que el conteo de "vencidas" cuadre
    // entre KPIs, alertas y este filtro. El orden inverso hacía que el chip dijera
    // "N vencidas" pero el filtro por VENCIDO mostrara 0, porque las que ya habían
    // arrancado se clasificaban como EN_PROCESO antes de llegar a este check).
    if (a.finProgramado && this.pd(a.finProgramado) < hoy) return 'VENCIDO';
    if (a.inicioEfectivo) return 'EN_PROCESO';
    if (a.inicioProgramado && this.pd(a.inicioProgramado) <= hoy) return 'EN_RIESGO';
    return 'PENDIENTE';
  }

  estadoGanttLabel(a: ActividadListItemDTO): string {
    const map = { CULMINADO:'✓ Culminado', EN_PROCESO:'▶ En proceso', VENCIDO:'⚠ Vencido', EN_RIESGO:'● En riesgo', PENDIENTE:'○ Pendiente' };
    return map[this.estadoGantt(a)];
  }

  estadoGanttColor(a: ActividadListItemDTO): string {
    const map = { CULMINADO:'#9CA3AF', EN_PROCESO:'#3B82F6', VENCIDO:'#EF4444', EN_RIESGO:'#F59E0B', PENDIENTE:'#93C5FD' };
    return map[this.estadoGantt(a)];
  }

  // ─── mini-gantt (hitos/entregables, todos los proyectos, próximos 3 meses) ──────
  // Ventana con 7 días de contexto hacia atrás (para que "HOY" no quede pegado al borde
  // izquierdo y lo vencido reciente se vea en contexto) + 90 días hacia adelante.
  readonly ganttPastDays   = 30;
  readonly ganttFutureDays = 150;
  get ganttWindowTotalDays(): number { return this.ganttPastDays + this.ganttFutureDays; }

  private readonly ganttEstadoColorMap: Record<string, string> = {
    CULMINADO: '#9CA3AF',
    'EN PROCESO': '#3B82F6',
    VENCIDO: '#EF4444',
    PENDIENTE: '#93C5FD',
    VACIO: '#CBD5E1',
  };
  private readonly ganttEstadoLabelMap: Record<string, string> = {
    CULMINADO: '✓ Culminado',
    'EN PROCESO': '▶ En proceso',
    VENCIDO: '⚠ Vencido',
    PENDIENTE: '○ Pendiente',
    VACIO: '—',
  };
  // Misma paleta que la página de Gantt completa (features/arquitectura-comercial/gantt) —
  // consistencia visual entre ambas vistas para el mismo concepto de "color = proyecto".
  private readonly ganttProjectPalette = [
    '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
    '#DB2777', '#0891B2', '#65A30D', '#9333EA', '#EA580C',
  ];

  ganttEstadoColor(estado: string): string { return this.ganttEstadoColorMap[estado] ?? '#CBD5E1'; }
  ganttEstadoLabel(estado: string): string { return this.ganttEstadoLabelMap[estado] ?? estado; }

  /** Color estable por nombre de proyecto (hash simple) — así cada proyecto siempre se ve del
   * mismo color en toda la fila, sin depender de listas ordenadas por aparición. */
  ganttProyectoColor(nombre: string): string {
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
    return this.ganttProjectPalette[hash % this.ganttProjectPalette.length];
  }

  private ganttWindowStart(): Date {
    const d = this.hoy();
    d.setDate(d.getDate() - this.ganttPastDays);
    return d;
  }

  /** % de la ventana total en la que cae "hoy" — para dibujar la línea de HOY. */
  get ganttTodayLeftPct(): number {
    return this.ganttPastDays / this.ganttWindowTotalDays * 100;
  }

  /** Celdas de mes con ancho proporcional real (no tercios iguales) — calendario exacto dentro
   * de la ventana [hoy-7d, hoy+90d], para que las líneas de mes caigan en el día 1 real. */
  get ganttMonthCells(): { label: string; widthPct: number }[] {
    const start = this.ganttWindowStart();
    const totalDays = this.ganttWindowTotalDays;
    const end = new Date(start); end.setDate(end.getDate() + totalDays);
    const cells: { label: string; widthPct: number }[] = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor < end) {
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const cellStart = cursor < start ? start : cursor;
      const cellEnd   = nextMonth < end ? nextMonth : end;
      const days = (cellEnd.getTime() - cellStart.getTime()) / 86400000;
      if (days > 0) {
        const label = cursor.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
        cells.push({ label: label.charAt(0).toUpperCase() + label.slice(1), widthPct: days / totalDays * 100 });
      }
      cursor = nextMonth;
    }
    return cells;
  }

  /** Offsets (%) de cada límite de mes dentro de la ventana, para dibujar las líneas verticales. */
  get ganttMonthBoundaries(): number[] {
    const out: number[] = [];
    let acc = 0;
    const cells = this.ganttMonthCells;
    for (let i = 0; i < cells.length - 1; i++) { acc += cells[i].widthPct; out.push(acc); }
    return out;
  }

  /** Posición/ancho (%) de la barra de un Entregable (tiene rango inicio→fin) dentro de la
   * ventana. Lo que empezó antes de la ventana se recorta al borde izquierdo. */
  ganttBarStyle(item: GanttMiniItemDTO): { left: string; width: string } {
    const windowStart = this.ganttWindowStart();
    const totalMs = this.ganttWindowTotalDays * 86400000;
    const itemStart = item.inicioProgramado ? this.pd(item.inicioProgramado)
                     : item.finProgramado    ? this.pd(item.finProgramado)
                     : this.hoy();
    const itemEnd   = item.finProgramado ? this.pd(item.finProgramado) : itemStart;
    const clampedStart = itemStart < windowStart ? windowStart : itemStart;
    const leftMs  = Math.max(0, clampedStart.getTime() - windowStart.getTime());
    const leftPct = Math.min(100, leftMs / totalMs * 100);
    const rawEndMs = Math.max(itemEnd.getTime() - clampedStart.getTime(), 86400000);
    const widthPct = Math.max(1.2, Math.min(100 - leftPct, rawEndMs / totalMs * 100));
    return { left: `${leftPct}%`, width: `${widthPct}%` };
  }

  /** Posición (%) del diamante de un Hito (un hito es un punto en el tiempo, no un rango —
   * convención estándar de Gantt: milestone = marca, no barra). */
  ganttMilestoneLeftPct(item: GanttMiniItemDTO): number {
    const windowStart = this.ganttWindowStart();
    const totalMs = this.ganttWindowTotalDays * 86400000;
    const due = item.finProgramado ? this.pd(item.finProgramado) : this.hoy();
    const clamped = due < windowStart ? windowStart : due;
    return Math.min(100, Math.max(0, (clamped.getTime() - windowStart.getTime()) / totalMs * 100));
  }

  get modalCargaFiltradas(): ActividadListItemDTO[] {
    const bounds = this.modalCargaSoloSemanaControl ? this.semanaControlBounds() : null;
    return this.modalCargaActividades.filter(a => {
      // Una CONSULTA no es lo mismo que un HITO/ENTREGABLE — se filtra antes que cualquier
      // otro criterio para que aplique igual en la vista "semana en control" y en la general.
      if (this.modalCargaFiltroTipo && a.partidaDeControl !== this.modalCargaFiltroTipo) return false;
      // Vista "vencenEstaSemana" (mismo criterio que usa el IES): solo las que su fin
      // programado cae dentro de la semana en control, sin importar su estado —
      // aquí SÍ se quiere ver PENDIENTE/EN_PROCESO junto a CULMINADO, para poder
      // comparar "cuáles de las N asignadas ya se cerraron".
      if (bounds) {
        if (!a.finProgramado) return false;
        const f = this.pd(a.finProgramado);
        if (f < bounds.inicio || f > bounds.fin) return false;
        return true;
      }
      // PENDIENTE se oculta por defecto (trabajo futuro que aún no toca) salvo que
      // el usuario lo pida explícitamente con el filtro de estado.
      if (this.estadoGantt(a) === 'PENDIENTE' && this.modalCargaFiltroEstado !== 'PENDIENTE') return false;
      if (this.modalCargaExcluirCulminadas && a.finEfectivo) return false;
      if (this.modalCargaFiltroEstado && this.estadoGantt(a) !== this.modalCargaFiltroEstado) return false;
      return true;
    });
  }

  abrirModalCarga(sup: TareasPorArquitectoDTO): void {
    this.modalCargaVisible           = true;
    this.modalCargaNombre            = sup.nombre;
    this.modalCargaLoading           = true;
    this.modalCargaActividades       = [];
    this.modalCargaExcluirCulminadas = true;
    this.modalCargaFiltroEstado      = '';
    this.modalCargaFiltroTipo        = '';
    this.modalCargaSoloSemanaControl = false;
    this.service.getActividades({ filtroUserId: sup.userId, soloActivas: true, porPagina: 500 }).subscribe({
      next: res => {
        this.modalCargaActividades = res.items ?? [];
        const items = this.modalCargaActividades;
        this.modalCargaStats = {
          hitos:       items.filter(a => a.partidaDeControl === 'HITO').length,
          entregables: items.filter(a => a.partidaDeControl === 'ENTREGABLE').length,
          consultas:   items.filter(a => a.partidaDeControl === 'CONSULTA').length,
          culminadas:  items.filter(a => !!a.finEfectivo).length,
          vencidas:    items.filter(a => !a.finEfectivo && a.finProgramado
                         && new Date(a.finProgramado) < new Date()).length,
        };
        this.modalCargaLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.modalCargaLoading = false; this.cdr.detectChanges(); },
    });
  }

  cerrarModalCarga(): void { this.modalCargaVisible = false; }

  estadoCargaColor(a: ActividadListItemDTO): string {
    if (a.finEfectivo) return '#1B6B3A';
    if (a.inicioEfectivo) return '#2E6DB4';
    if (a.finProgramado && new Date(a.finProgramado) < new Date()) return '#C0392B';
    return '#D4A017';
  }

  estadoCargaLabel(a: ActividadListItemDTO): string {
    if (a.finEfectivo) return 'Culminado';
    if (a.inicioEfectivo) return 'En proceso';
    if (a.finProgramado && new Date(a.finProgramado) < new Date()) return 'Vencido';
    return 'Pendiente';
  }

  // ─── modal hitos ───────────────────────────────────────────────
  modalHitosVisible = false;
  tabHito           : TabHito = 'VENCER';

  // ─── modales de gantt (se abren desde el botón del header, ya no están inline) ─
  modalGanttHitosVisible       = false;
  modalGanttEntregablesVisible = false;

  // ─── modal detalle de item de gantt (hito o entregable individual) ─
  modalGanttItemVisible = false;
  ganttItemSeleccionado : GanttMiniItemDTO | null = null;
  ganttItemTipo         : 'HITO' | 'ENTREGABLE' = 'HITO';

  abrirGanttItem(item: GanttMiniItemDTO, tipo: 'HITO' | 'ENTREGABLE'): void {
    this.ganttItemSeleccionado = item;
    this.ganttItemTipo = tipo;
    this.modalGanttItemVisible = true;
  }

  cerrarGanttItem(): void {
    this.modalGanttItemVisible = false;
    this.ganttItemSeleccionado = null;
  }

  /** Días restantes hasta finProgramado (negativo = vencido), para el modal de detalle. */
  ganttItemDiasRestantes(item: GanttMiniItemDTO): number | null {
    if (!item.finProgramado) return null;
    const fin = this.pd(item.finProgramado);
    return Math.round((fin.getTime() - this.hoy().getTime()) / 86400000);
  }

  // ─── modal histórico de supervisor ──────────────────────────────
  modalHistoricoVisible   = false;
  cargandoHistorico       = false;
  historicoSupervisor     : SupervisorHistoricoDTO | null = null;
  historicoSupervisorNombre = '';
  historicoSupervisorUserId : number | null = null;

  distribucionTipos: ChartItemDTO[] = [];

  // ─── charts ───────────────────────────────────────────────────
  private consultasChart ?: Chart;
  private tiposChart     ?: Chart;
  private historicoChart ?: Chart;
  private cargaHistoricoChart?: Chart;

  @ViewChild('consultasCanvas')  consultasRef !: ElementRef<HTMLCanvasElement>;
  @ViewChild('tiposCanvas')      tiposRef     !: ElementRef<HTMLCanvasElement>;
  @ViewChild('historicoCanvas')  historicoRef ?: ElementRef<HTMLCanvasElement>;
  @ViewChild('cargaHistoricoCanvas') cargaHistoricoRef?: ElementRef<HTMLCanvasElement>;

  constructor(
    private service     : ArquitecturaComercialService,
    private errorService: ErrorService,
    private cdr         : ChangeDetectorRef,
    private router      : Router,
  ) {}

  // ─── lifecycle ────────────────────────────────────────────────
  ngAfterViewInit() { this.generarFiltrosTiempo(); this.cargar(); }
  ngOnDestroy()     { this.destruirCharts(); }

  // ─── carga principal ──────────────────────────────────────────
  cargar() {
    this.loader = true;
    const f = this.getFiltroActual();
    forkJoin({
      dashboard: this.service.getDashboardV2(f),
      proyectos : this.service.getProyectosConActividades().pipe(catchError(() => of([]))),
      workers   : this.service.getSupervisoresAc().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ dashboard, proyectos, workers }) => {
        this.proyectos   = proyectos.map(p => ({ id: p.id, nombre: p.nombre }));
        this.arquitectos = workers.map(w => ({ id: w.id, nombre: w.apellidoNombre }));
        if (dashboard.categorias?.length) this.categorias = dashboard.categorias;
        this.aplicarDashboard(dashboard);
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => { this.errorService.handleError(err); this.loader = false; },
    });
  }

  buscar() {
    this.loader = true;
    this.cdr.detectChanges();
    this.service.getDashboardV2(this.getFiltroActual()).subscribe({
      next : (d) => { this.aplicarDashboard(d); this.loader = false; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => { this.errorService.handleError(err); this.loader = false; },
    });
  }

  seleccionarCategoria(id: number | null) {
    this.categoriaActiva = id;
    this.filtro.categoriaId = id;
    this.buscar();
  }

  private getFiltroActual(): DashboardFiltroDTO {
    return { ...this.filtro, categoriaId: this.categoriaActiva };
  }

  private aplicarDashboard(d: ArqComercialDashboardDTO) {
    this.kpis                    = d.kpis;
    this.alertas                 = d.alertas;
    this.supervisores            = d.supervisores            ?? [];
    this.hitosCriticos           = d.hitosCriticos           ?? [];
    this.tareasPorArquitecto     = d.tareasPorArquitectoDetalle ?? [];
    this.proximosPorProyecto     = d.proximosPorProyecto      ?? [];
    this.eficienciaConsultas     = d.eficienciaConsultas       ?? [];
    this.ganttHitos              = d.ganttHitos               ?? [];
    this.ganttEntregables        = d.ganttEntregables          ?? [];
    this.distribucionPorCategoria= d.distribucionPorCategoria ?? [];
    this.distribucionTipos       = d.distribucionTipos        ?? [];
    this.semanaActual            = d.semanaActual             ?? null;
    this.rangoUltimasSemanas     = d.rangoUltimasSemanas       ?? '';
    this.cdr.detectChanges();
    this.destruirCharts();
    setTimeout(() => { this.renderCharts(); this.cdr.detectChanges(); }, 50);
  }

  // ─── charts ──────────────────────────────────────────────────
  private destruirCharts() {
    this.consultasChart?.destroy();
    this.tiposChart?.destroy();
    this.historicoChart?.destroy();
    this.cargaHistoricoChart?.destroy();
  }

  private renderCharts() {
    this.renderConsultasChart();
    this.renderTiposChart();
  }

  /** Tasa de cierre semanal SOLO de Consultas (últimas 8 semanas) — reemplaza a "Tendencia SPI",
   * que en realidad mostraba el IES compuesto (Hitos+Entregables+Consultas mezclados), no un SPI
   * real y no distinguía que una Consulta se cumple distinto que un Hito/Entregable. Semanas sin
   * consultas venciendo quedan como hueco en la línea (null), no como una caída a 0%. */
  private renderConsultasChart() {
    if (!this.consultasRef?.nativeElement) return;
    const data = this.eficienciaConsultas;
    const vals = data.map(s => s.tasaCierre);
    this.consultasChart = new Chart(this.consultasRef.nativeElement, {
      type: 'line',
      data: {
        labels: data.map(s => s.semana),
        datasets: [
          {
            label: 'Tasa de cierre',
            data: vals,
            spanGaps: false,
            borderColor: '#7C3AED',
            backgroundColor: (ctx: any) => {
              const { chart } = ctx;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return 'rgba(124,58,237,0.08)';
              const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(124,58,237,0.20)');
              gradient.addColorStop(1, 'rgba(124,58,237,0.01)');
              return gradient;
            },
            borderWidth: 2.5,
            pointRadius: 3.5,
            pointBackgroundColor: vals.map(v => v == null ? 'transparent' : v >= 80 ? '#0F7A4E' : v >= 50 ? '#C4860A' : '#C94040'),
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            fill: true,
            cubicInterpolationMode: 'monotone' as const,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          datalabels: { display: false },
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B', cornerRadius: 6, padding: 8,
            callbacks: {
              label: (item: any) => {
                const s = data[item.dataIndex];
                if (s?.tasaCierre == null) return ' Sin consultas venciendo esta semana';
                const spi = s.spiPromedio != null ? ` · SPI ${s.spiPromedio.toFixed(2)}` : '';
                return ` Tasa de cierre: ${s.tasaCierre.toFixed(1)}%${spi}`;
              },
            },
          },
        },
        scales: {
          y: { min: 0, max: 100, grid: { color: 'rgba(148,163,184,0.15)' }, border: { display: false }, ticks: { callback: (v: any) => `${v}%`, font: { size: 9 }, color: '#94A3B8', maxTicksLimit: 5 } },
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94A3B8' } },
        },
      },
    });
  }

  private renderTiposChart() {
    if (!this.tiposRef?.nativeElement) return;
    const sinProg = Math.max(0,
      this.kpis.totalActividades - this.kpis.culminadas - this.kpis.enProceso
      - this.kpis.vencidas - this.kpis.pendientes);
    const labels = ['Culminadas', 'En proceso', 'Vencidas', 'Pendientes', 'Sin prog.'];
    const vals   = [this.kpis.culminadas, this.kpis.enProceso, this.kpis.vencidas, this.kpis.pendientes, sinProg];
    const colors = ['#1B6B3A', '#2E6DB4', '#C0392B', '#4A5568', '#CBD5E1'];
    this.tiposChart = new Chart(this.tiposRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 5 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          datalabels: { display: false },
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a:number,b:number)=>a+b,0);
                const pct   = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
                return ` ${ctx.label}: ${ctx.parsed} – ${pct}%`;
              },
            },
          },
        },
      },
    });
  }

  get estadoDonutItems() {
    const total   = this.kpis.totalActividades || 1;
    const sinProg = Math.max(0, total - this.kpis.culminadas - this.kpis.enProceso
                                      - this.kpis.vencidas   - this.kpis.pendientes);
    return [
      { label: 'Culminadas', value: this.kpis.culminadas, color: '#1B6B3A',
        pct: Math.round(this.kpis.culminadas / total * 100) },
      { label: 'En proceso', value: this.kpis.enProceso,  color: '#2E6DB4',
        pct: Math.round(this.kpis.enProceso  / total * 100) },
      { label: 'Vencidas',   value: this.kpis.vencidas,   color: '#C0392B',
        pct: Math.round(this.kpis.vencidas   / total * 100) },
      { label: 'Pendientes', value: this.kpis.pendientes, color: '#4A5568',
        pct: Math.round(this.kpis.pendientes / total * 100) },
      { label: 'Sin prog.',  value: sinProg,               color: '#CBD5E1',
        pct: Math.round(sinProg              / total * 100) },
    ];
  }

  // getter para usar IES en el ranking (supervisores ya tiene el índice compuesto)
  get rankingIES() {
    return [...this.supervisores].sort((a, b) => b.progreso - a.progreso);
  }

  // ─── supervisor / carga helpers ──────────────────────────────
  get tareasPorArquitectoOrdenado(): TareasPorArquitectoDTO[] {
    return [...this.tareasPorArquitecto].sort((a, b) => b.totalPonderado - a.totalPonderado);
  }

  filtrarPorSupervisor(userId: number) {
    this.filtro.userId = this.filtro.userId === userId ? null : userId;
    this.buscar();
  }

  /** Filtra el dashboard entero por proyecto al hacer click en una fila de "Próximos
   * Entregables/Hitos" — mismo patrón toggle que filtrarPorSupervisor. */
  filtrarPorProyecto(proyectoId: number) {
    this.filtro.proyectoId = this.filtro.proyectoId === proyectoId ? null : proyectoId;
    this.buscar();
  }

  // ─── modal simple: entregables/hitos de un proyecto (próximos 14 días) ─
  modalProximoVisible = false;
  modalProximoProyecto = '';
  modalProximoItems: { nombre: string; tipo: 'Hito' | 'Entregable'; fecha: string | null; estado: string }[] = [];

  /** true si vence dentro de los próximos 14 días (mismo criterio que el badge E/H de esta card) —
   * el mini-gantt usa una ventana mucho más ancha (30 atrás/150 adelante), así que hay que
   * filtrar aparte para que el modal no muestre más items de los que el badge anuncia. */
  private venceEn14Dias(finProgramado: string | null): boolean {
    if (!finProgramado) return false;
    const dias = Math.round((this.pd(finProgramado).getTime() - this.hoy().getTime()) / 86400000);
    return dias >= 0 && dias <= 14;
  }

  abrirProximoDetalle(p: ProximoPorProyectoDTO): void {
    this.modalProximoProyecto = p.proyectoNombre;
    this.modalProximoItems = [
      ...this.ganttHitos
        .filter(h => h.proyecto === p.proyectoNombre && this.venceEn14Dias(h.finProgramado))
        .map(h => ({ nombre: h.nombre, tipo: 'Hito' as const, fecha: h.finProgramado, estado: h.estado })),
      ...this.ganttEntregables
        .filter(e => e.proyecto === p.proyectoNombre && this.venceEn14Dias(e.finProgramado))
        .map(e => ({ nombre: e.nombre, tipo: 'Entregable' as const, fecha: e.finProgramado, estado: e.estado })),
    ];
    this.modalProximoVisible = true;
  }

  cerrarProximoDetalle(): void { this.modalProximoVisible = false; }

  // Nota: la clasificación Sobrecargado/Normal/Disponible se basa en `totalPonderado`
  // (Hito×3 + Entregable×2 + Consulta×1), no en el conteo crudo de `total` — una consulta
  // puntual no implica la misma carga real que un hito o entregable. `total` se sigue
  // mostrando en la tarjeta como dato informativo (cuántas partidas son en total).
  get cargaStats() {
    const d = this.tareasPorArquitectoOrdenado;
    if (!d.length) return null;
    const ponderados = d.map(s => s.totalPonderado);
    const max  = Math.max(...ponderados);
    const sum  = ponderados.reduce((a, b) => a + b, 0);
    const avg  = sum / d.length;
    const avgPct = max > 0 ? avg / max * 100 : 0;
    return { max, avg, avgRedondeado: Math.round(avg), avgPct };
  }

  cargaBarPct(totalPonderado: number): number {
    const s = this.cargaStats;
    return s && s.max > 0 ? Math.round(totalPonderado / s.max * 100) : 0;
  }

  cargaTag(totalPonderado: number): string {
    const s = this.cargaStats;
    if (!s) return '';
    if (totalPonderado > s.avg * 1.3) return 'Sobrecargado';
    if (totalPonderado < s.avg * 0.7) return 'Disponible';
    return 'Normal';
  }

  cargaTagStyle(totalPonderado: number): { bg: string; color: string } {
    const s = this.cargaStats;
    if (!s) return { bg: '#F1F5F9', color: '#64748B' };
    if (totalPonderado > s.avg * 1.3) return { bg: '#FDF2F2', color: '#C0392B' };
    if (totalPonderado < s.avg * 0.7) return { bg: '#EAF3DE', color: '#1B6B3A' };
    return { bg: '#EDF4FB', color: '#2E6DB4' };
  }

  cargaBarGradient(totalPonderado: number): string {
    const s = this.cargaStats;
    if (!s) return '#D6E4F0';
    if (totalPonderado > s.avg * 1.3) return 'linear-gradient(90deg,#E74C3C,#C0392B)';
    if (totalPonderado < s.avg * 0.7) return 'linear-gradient(90deg,#27AE60,#1B6B3A)';
    return 'linear-gradient(90deg,#2E6DB4,#1B3A6B)';
  }

  get cargaInsights(): string[] {
    const d = this.tareasPorArquitectoOrdenado;
    const s = this.cargaStats;
    if (!s || !d.length) return [];
    const out: string[] = [];

    const masCargado   = d[0];
    const menosCargado = d[d.length - 1];
    const sobrecargados = d.filter(x => x.totalPonderado > s.avg * 1.3);
    const disponibles   = d.filter(x => x.totalPonderado < s.avg * 0.7);

    sobrecargados.forEach(x => {
      out.push(`🔴 ${this.primerApellido(x.nombre)} tiene ${x.total} act. (carga ponderada ${x.totalPonderado} vs. media ${s.avgRedondeado}) — redistribuir urgente`);
    });
    disponibles.forEach(x => {
      out.push(`🟢 ${this.primerApellido(x.nombre)} tiene capacidad — asignar actividades`);
    });

    const brecha = masCargado.totalPonderado - menosCargado.totalPonderado;
    if (brecha > s.avg * 0.5) {
      out.push(`⚖️ Brecha de carga entre ${this.primerApellido(masCargado.nombre)} y ${this.primerApellido(menosCargado.nombre)}`);
    }
    if (!out.length) {
      out.push(`✅ Carga equilibrada (media ponderada ${s.avgRedondeado} por supervisor)`);
    }
    return out;
  }

  getAvancePctColor(pct: number): string {
    if (pct >= 70) return '#059669';
    if (pct >= 50) return '#3b82f6';
    return '#ef4444';
  }

  // ─── modal alertas ────────────────────────────────────────────
  private tituloAlerta: Record<TipoAlerta, string> = {
    VENCIDA      : 'Vencidas Sin Cerrar',
    VENCE_SEMANA : 'Vencen Esta Semana',
    ARRANQUE     : 'Arrancan Esta Semana',
    HITO_PROXIMO : 'Hitos Próximos (14d)',
  };

  abrirModalAlerta(tipo: TipoAlerta) {
    this.modalAlertaTipo       = tipo;
    this.modalAlertaTitulo     = this.tituloAlerta[tipo];
    this.modalAlertaActividades= [];
    this.seleccionados         = new Set();
    this.modalAlertaVisible    = true;
    this.modalAlertaLoading    = true;
    this.service.getActividadesPorAlerta(tipo, this.getFiltroActual()).subscribe({
      next : (list) => { this.modalAlertaActividades = list; this.modalAlertaLoading = false; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => { this.errorService.handleError(err); this.modalAlertaLoading = false; },
    });
  }

  cerrarModalAlerta() { this.modalAlertaVisible = false; this.modalAlertaTipo = null; }

  toggleSeleccion(id: number) {
    this.seleccionados.has(id) ? this.seleccionados.delete(id) : this.seleccionados.add(id);
  }

  toggleTodos(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.modalAlertaActividades.forEach(a => this.seleccionados.add(a.id));
    else this.seleccionados.clear();
  }

  get todosMarcados(): boolean {
    return this.modalAlertaActividades.length > 0 &&
           this.modalAlertaActividades.every(a => this.seleccionados.has(a.id));
  }

  enviarAlertas() {
    if (!this.seleccionados.size || !this.modalAlertaTipo) return;
    this.enviandoAlerta = true;
    const req: EnviarAlertaRequestDTO = {
      actividadIds: [...this.seleccionados],
      tipoAlerta  : this.modalAlertaTipo,
    };
    this.service.enviarAlertasActividades(req).subscribe({
      next : () => { this.enviandoAlerta = false; this.cerrarModalAlerta(); },
      error: (err: HttpErrorResponse) => { this.errorService.handleError(err); this.enviandoAlerta = false; },
    });
  }

  // ─── modal hitos ────────────────────────────────────────────
  abrirModalHitos() { this.modalHitosVisible = true; }
  cerrarModalHitos() { this.modalHitosVisible = false; }

  // ─── modal lista de entregables (gantt) ─────────────────────────
  modalEntregablesVisible = false;
  abrirModalEntregables() { this.modalEntregablesVisible = true; }
  cerrarModalEntregables() { this.modalEntregablesVisible = false; }

  /** Abre el modal de carga mostrando solo las actividades cuyo fin programado cae
   * dentro de la semana en control (el mismo conjunto "N asignadas" que cuenta el
   * IES del ranking), para poder ver cuáles de esas N ya se culminaron y cuáles no. */
  verDetalleSemanaSupervisor(sup: SupervisorProgresoDTO): void {
    const dto: TareasPorArquitectoDTO = {
      userId: sup.userId, nombre: sup.nombre,
      hitos: 0, entregables: 0, consultas: 0, total: 0, totalPonderado: 0, avancePct: 0,
    };
    this.abrirModalCarga(dto);
    this.modalCargaExcluirCulminadas = false;
    this.modalCargaSoloSemanaControl = true;
  }

  // ─── modal histórico de supervisor ──────────────────────────
  // Se abre tanto desde Ranking Eficiencia (SupervisorProgresoDTO) como desde Distribución
  // de Carga (TareasPorArquitectoDTO) — solo necesita userId + nombre de cualquiera de las dos.
  abrirHistoricoSupervisor(sup: { userId: number; nombre: string }): void {
    this.modalHistoricoVisible   = true;
    this.historicoSupervisorNombre = sup.nombre;
    this.historicoSupervisorUserId = sup.userId;
    this.historicoSupervisor     = null;
    this.cargandoHistorico       = true;
    this.service.getSupervisorHistorico(sup.userId).subscribe({
      next: (h) => {
        this.historicoSupervisor = h;
        this.cargandoHistorico   = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.renderHistoricoChart(); this.renderCargaHistoricoChart(); });
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoHistorico = false;
        this.errorService.handleError(err);
      },
    });
  }

  cerrarModalHistorico(): void {
    this.modalHistoricoVisible = false;
    this.historicoChart?.destroy();
    this.historicoChart = undefined;
    this.cargaHistoricoChart?.destroy();
    this.cargaHistoricoChart = undefined;
    this.historicoSupervisor = null;
  }

  /** Abre el modal de actividades (mismo que el ranking de carga) ya filtrado
   * por estado, para ver el detalle de cualquiera de los 5 tiles del histórico
   * (Total / Culminadas / En proceso / Pendientes / Vencidas). '' = sin filtro (Total). */
  verActividadesHistorico(estado: '' | 'CULMINADO' | 'EN_PROCESO' | 'VENCIDO' | 'PENDIENTE'): void {
    if (this.historicoSupervisorUserId == null) return;
    const sup: TareasPorArquitectoDTO = {
      userId: this.historicoSupervisorUserId,
      nombre: this.historicoSupervisorNombre,
      hitos: 0, entregables: 0, consultas: 0, total: 0, totalPonderado: 0, avancePct: 0,
    };
    this.cerrarModalHistorico();
    this.abrirModalCarga(sup);
    // abrirModalCarga excluye culminadas por defecto — acá se quiere ver Total/Culminadas
    // también, así que se desactiva y se deja que modalCargaFiltroEstado haga todo el filtrado.
    this.modalCargaExcluirCulminadas = false;
    this.modalCargaFiltroEstado = estado;
  }

  private renderHistoricoChart(): void {
    if (!this.historicoRef?.nativeElement || !this.historicoSupervisor) return;
    this.historicoChart?.destroy();
    const data = this.historicoSupervisor.tendenciaSemanal;
    this.historicoChart = new Chart(this.historicoRef.nativeElement, {
      type: 'line',
      data: {
        labels: data.map(s => s.semana),
        datasets: [{
          label: 'Tasa de cierre',
          data: data.map(s => s.valor),
          borderColor: '#2563EB',
          backgroundColor: (ctx: any) => {
            const { chart } = ctx;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(37,99,235,0.10)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(37,99,235,0.20)');
            gradient.addColorStop(1, 'rgba(37,99,235,0.01)');
            return gradient;
          },
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#2563EB',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          fill: true,
          cubicInterpolationMode: 'monotone' as const,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          datalabels: { display: false },
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B', cornerRadius: 6, padding: 8,
            callbacks: { label: (item: any) => ` Tasa de cierre: ${Number(item.raw).toFixed(1)}%` },
          },
        },
        scales: {
          y: { min: 0, max: 100, grid: { color: 'rgba(148,163,184,0.15)' }, border: { display: false }, ticks: { callback: (v: any) => `${v}%`, font: { size: 9 }, color: '#94A3B8', maxTicksLimit: 5 } },
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94A3B8' } },
        },
      },
    });
  }

  private readonly cargaTagColor: Record<string, string> = {
    SOBRECARGADO: '#C0392B',
    NORMAL: '#2E6DB4',
    DISPONIBLE: '#1B6B3A',
  };

  /** Carga ponderada semana a semana (últimas 8 semanas) — para distinguir una sobrecarga
   * puntual de un patrón que se repite (picos constantes). Color de cada barra = clasificación
   * de esa semana (Sobrecargado/Normal/Disponible), línea punteada = media del equipo esa semana. */
  private renderCargaHistoricoChart(): void {
    if (!this.cargaHistoricoRef?.nativeElement || !this.historicoSupervisor) return;
    this.cargaHistoricoChart?.destroy();
    const data: CargaSemanalDTO[] = this.historicoSupervisor.tendenciaCarga ?? [];
    this.cargaHistoricoChart = new Chart(this.cargaHistoricoRef.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(s => s.semana),
        datasets: [
          {
            label: 'Carga ponderada',
            data: data.map(s => s.totalPonderado),
            backgroundColor: data.map(s => this.cargaTagColor[s.tag] ?? '#94A3B8'),
            borderRadius: 4,
            maxBarThickness: 26,
            order: 2,
          },
          {
            label: 'Media del equipo',
            type: 'line' as const,
            data: data.map(s => s.promedioEquipo),
            borderColor: '#94A3B8',
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          datalabels: { display: false },
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B', cornerRadius: 6, padding: 8,
            callbacks: {
              label: (item: any) => {
                if (item.dataset.label === 'Media del equipo') return ` Media equipo: ${Number(item.raw).toFixed(1)}`;
                const tag = data[item.dataIndex]?.tag ?? '';
                return ` Carga ponderada: ${item.raw} (${tag.toLowerCase() || 'sin datos'})`;
              },
            },
          },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94A3B8', maxTicksLimit: 5 } },
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94A3B8' } },
        },
      },
    });
  }

  get hitosIniciar(): HitoCriticoDTO[] {
    return this.hitosCriticos.filter(h => h.diasRestantes >= 0 && h.diasRestantes <= 7);
  }
  get hitosVencer(): HitoCriticoDTO[] {
    return this.hitosCriticos.filter(h => h.diasRestantes > 7 && h.diasRestantes <= 30);
  }
  get hitosVencidos(): HitoCriticoDTO[] {
    return this.hitosCriticos.filter(h => h.diasRestantes < 0);
  }

  alertarHito(hito: HitoCriticoDTO) {
    if (!hito.id) return;
    const req: EnviarAlertaRequestDTO = { actividadIds: [hito.id], tipoAlerta: 'HITO_PROXIMO' };
    this.service.enviarAlertasActividades(req).subscribe({
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  enviandoAlertaHitos = false;
  enviarAlertaHitos(): void {
    const ids = this.hitosCriticos.map(h => h.id).filter((id): id is number => !!id);
    if (!ids.length) return;
    this.enviandoAlertaHitos = true;
    this.service.enviarAlertasActividades({ actividadIds: ids, tipoAlerta: 'HITO_PROXIMO' }).subscribe({
      next: () => {
        this.enviandoAlertaHitos = false;
        Swal.fire({ icon: 'success', title: 'Alerta enviada', text: `Se notificó a los responsables de ${ids.length} hitos críticos.`, timer: 3000, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoAlertaHitos = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ─── helpers UI ──────────────────────────────────────────────
  /** Supervisores con compromisos esta semana — los "sin compromisos" no participan
   * de ningún promedio/insight agregado (no tiene sentido promediar un IES que no existe). */
  private get supervisoresConCompromisos(): SupervisorProgresoDTO[] {
    return this.supervisores.filter(s => !s.sinCompromisos);
  }

  get promedioEficiencia(): number {
    const activos = this.supervisoresConCompromisos;
    if (!activos.length) return 0;
    return Math.round(activos.reduce((s, x) => s + x.progreso, 0) / activos.length);
  }

  get rankingInsights(): string[] {
    const activos = this.supervisoresConCompromisos;
    if (!activos.length) return [];
    const sorted = [...activos].sort((a, b) => b.progreso - a.progreso);
    const mejor = sorted[0];
    const peor  = sorted[sorted.length - 1];
    const out: string[] = [];
    out.push(`🏆 ${this.primerApellido(mejor.nombre)} lidera con ${Math.round(mejor.progreso)}% IES`);
    const criticos = sorted.filter(s => s.progreso < 50);
    if (criticos.length) {
      const masC = criticos[criticos.length - 1];
      out.push(`⚠️ ${this.primerApellido(masC.nombre)} está en nivel crítico (${Math.round(masC.progreso)}%)`);
    }
    out.push(`📊 Brecha de ${(mejor.progreso - peor.progreso).toFixed(0)}pp entre mejor y peor`);
    out.push(`📈 Promedio equipo en ${this.promedioEficiencia}%`);
    return out;
  }

  get equipoEquilibrado(): boolean {
    const activos = this.supervisoresConCompromisos;
    if (activos.length < 2) return true;
    const v = activos.map(s => s.progreso);
    return Math.max(...v) - Math.min(...v) <= 30;
  }

  getInitials(nombre: string): string {
    const p = nombre.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : nombre.substring(0, 2).toUpperCase();
  }

  primerApellido(nombre: string): string {
    return nombre.trim().split(/\s+/)[0] ?? nombre;
  }

  getAvatarBg(p: number): string {
    if (p >= 75) return '#EAF3DE';
    if (p >= 60) return '#EDF4FB';
    if (p >= 45) return '#FEF9E7';
    return '#FDF2F2';
  }

  getAvatarColor(p: number): string {
    if (p >= 75) return '#1B6B3A';
    if (p >= 60) return '#2E6DB4';
    if (p >= 45) return '#D4A017';
    return '#C0392B';
  }

  getComentario(sup: SupervisorProgresoDTO): string {
    if (sup.progreso >= 85) return 'Excelente';
    if (sup.progreso >= 75) return 'Sobre prom.';
    if (sup.progreso >= 60) return 'En promedio';
    if (sup.progreso >= 45) return 'Bajo prom.';
    return 'Crítico';
  }

  getComentarioBg(sup: SupervisorProgresoDTO): string {
    if (sup.progreso >= 75) return '#EAF3DE';
    if (sup.progreso >= 60) return '#EDF4FB';
    if (sup.progreso >= 45) return '#FEF9E7';
    return '#FDF2F2';
  }

  getComentarioColor(sup: SupervisorProgresoDTO): string {
    if (sup.progreso >= 75) return '#1B6B3A';
    if (sup.progreso >= 60) return '#2E6DB4';
    if (sup.progreso >= 45) return '#D4A017';
    return '#C0392B';
  }
  getProyectada(p: number)     { return Math.min(100, Math.round(p * 1.12)); }

  getHitoColor(dias: number): string {
    if (dias < 0 || dias <= 3) return '#C0392B';
    if (dias <= 7)             return '#D97706';
    return '#2E6DB4';
  }

  getSubtitulo(): string {
    if (this.semanaActual) return this.semanaActual.label;
    const n = new Date();
    const mes = n.toLocaleString('es-PE', { month: 'long' });
    const anio = n.getFullYear();
    const w = Math.ceil(((n.getTime() - new Date(anio, 0, 1).getTime()) / 86400000 + new Date(anio, 0, 1).getDay() + 1) / 7);
    return `Semana ${w} · ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`;
  }

  get totalesPartidas() {
    const t = this.distribucionPorCategoria.reduce(
      (acc, c) => ({
        total: acc.total + c.total,
        culminadas: acc.culminadas + c.culminadas,
        enProceso: acc.enProceso + c.enProceso,
        vencidas: acc.vencidas + c.vencidas,
        pendientes: acc.pendientes + c.pendientes,
      }),
      { total: 0, culminadas: 0, enProceso: 0, vencidas: 0, pendientes: 0 },
    );
    return { ...t, progreso: t.total > 0 ? Math.round((t.culminadas / t.total) * 1000) / 10 : 0 };
  }

  filtrarPorCategoria(categoria: string) {
    this.router.navigate(['/arquitectura-comercial/actividades'], {
      queryParams: { categoria },
    });
  }

  filtrarPorEstado(estado: string) {
    this.router.navigate(['/arquitectura-comercial/actividades'], {
      queryParams: { estado },
    });
  }

  filtrarPorCategoriaYEstado(categoria: string, estado: string) {
    this.router.navigate(['/arquitectura-comercial/actividades'], {
      queryParams: { categoria, estado },
    });
  }

  getCategoriaAccent(id: number): string {
    const map: Record<number, string> = { 1: '#2E6DB4', 2: '#1B6B3A', 3: '#D97706', 4: '#7C3AED' };
    return map[id] ?? '#64748B';
  }

  getCategoriaGradient(id: number): string {
    const map: Record<number, string> = {
      1: 'linear-gradient(135deg,#EAF0FB,#D3E3F9)',
      2: 'linear-gradient(135deg,#EAF5EF,#D0EED9)',
      3: 'linear-gradient(135deg,#FBF3E4,#F5E4C0)',
      4: 'linear-gradient(135deg,#F3EEFF,#E6D8FF)',
    };
    return map[id] ?? 'linear-gradient(135deg,#F1F5F9,#E2E8F0)';
  }

  getSpiKpiColor(spi: number): string {
    if (spi > 1.05) return '#2E6DB4';  // Adelantado
    if (spi >= 0.95) return '#1B6B3A'; // En tiempo
    if (spi >= 0.80) return '#D97706'; // Leve retraso
    return '#C0392B';                   // Crítico
  }

  getSpiColor(spi: number | null | undefined): string {
    if (!spi) return '#9CA3AF';
    if (spi >= 0.95) return '#1B6B3A';
    if (spi >= 0.80) return '#D97706';
    return '#C0392B';
  }

  getSpiLabel(spi: number | null | undefined): string {
    if (!spi) return '—';
    return spi.toFixed(2);
  }

  diasLabel(dias: number): string {
    if (dias < 0)  return `Vencido ${dias * -1}d`;
    if (dias === 0)return 'Hoy';
    return `${dias}d`;
  }

  private generarFiltrosTiempo() {
    const now = new Date();
    const anio = now.getFullYear();
    this.filtro.anio = anio;
    this.semanas = Array.from({ length: 52 }, (_, i) => ({ value: i + 1, label: `Semana ${i + 1}` }));
    const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    this.meses = mesesNombres.map((m, i) => ({ value: i + 1, label: m }));
  }
}