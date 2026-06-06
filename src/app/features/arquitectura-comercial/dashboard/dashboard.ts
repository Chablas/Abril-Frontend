import {
  Component, AfterViewInit, ChangeDetectorRef,
  ElementRef, ViewChild, OnDestroy,
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels    from 'chartjs-plugin-datalabels';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of }   from 'rxjs';
import { catchError }     from 'rxjs/operators';
import { ArquitecturaComercialService } from '../../../core/services/arquitectura-comercial.service';
import { ErrorService }   from '../../../core/services/error.service';
import {
  ArqComercialDashboardDTO,
  ArqComercialKpiDTO,
  ArqComercialAlertDTO,
  SupervisorProgresoDTO,
  HitoCriticoDTO,
  TareasPorArquitectoDTO,
  AvanceSemanalDTO,
  EficienciaSpiDTO,
  CategoriaItemDTO,
} from '../../../core/dtos/arquitectura-comercial/arquitectura-comercial-dashboard.model';
import {
  ActividadAlertaDTO,
  DashboardFiltroDTO,
  EnviarAlertaRequestDTO,
} from '../../../core/dtos/arquitectura-comercial/arquitectura-comercial-alert.model';

Chart.register(...registerables, ChartDataLabels);

// ─── tipos locales ───────────────────────────────────────────────
type TipoAlerta = 'VENCIDA' | 'VENCE_SEMANA' | 'ARRANQUE' | 'HITO_PROXIMO';
type TabHito    = 'INICIAR' | 'VENCER' | 'VENCIDOS';

@Component({
  selector   : 'app-arq-comercial-dashboard',
  standalone : true,
  imports    : [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl   : './dashboard.css',
})
export class Dashboard implements AfterViewInit, OnDestroy {

  // ─── estado global ──────────────────────────────────────────────
  loader = true;
  enviandoAlerta = false;

  // ─── categoría activa (pill principal) ─────────────────────────
  categoriaActiva: number | null = null;   // null = TODOS

  // ─── filtros secundarios ────────────────────────────────────────
  filtro: DashboardFiltroDTO = {
    categoriaId : null,
    proyectoId  : null,
    userId      : null,
    semana      : null,
    mes         : null,
    anio        : null,
  };

  // ─── datos del dashboard ────────────────────────────────────────
  kpis: ArqComercialKpiDTO = {
    totalActividades: 0, culminadas: 0, enProceso: 0,
    vencidas: 0, pendientes: 0, eficienciaMedia: 0, progresoGlobal: 0,
  };
  alertas: ArqComercialAlertDTO = {
    vencidasSinCerrar: 0, vencenEstaSemana: 0,
    arrancanEstaSemana: 0, hitosProximos14Dias: 0,
  };
  supervisores       : SupervisorProgresoDTO[]     = [];
  hitosCriticos      : HitoCriticoDTO[]            = [];
  tareasPorArquitecto: TareasPorArquitectoDTO[]    = [];
  avanceSemanal      : AvanceSemanalDTO[]          = [];
  eficienciaSpi      : EficienciaSpiDTO[]          = [];
  categorias         : CategoriaItemDTO[]          = [];

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

  // ─── modal hitos ───────────────────────────────────────────────
  modalHitosVisible = false;
  tabHito           : TabHito = 'VENCER';

  // ─── charts ───────────────────────────────────────────────────
  private avanceChart    ?: Chart;
  private eficienciaChart?: Chart;
  private distribucionChart?: Chart;
  private tareasChart    ?: Chart;

  @ViewChild('avanceCanvas')     avanceRef    !: ElementRef<HTMLCanvasElement>;
  @ViewChild('eficienciaCanvas') eficienciaRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distribucionCanvas') distribucionRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tareasCanvas')     tareasRef    !: ElementRef<HTMLCanvasElement>;

  constructor(
    private service     : ArquitecturaComercialService,
    private errorService: ErrorService,
    private cdr         : ChangeDetectorRef,
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
      proyectos : this.service.getProyectos().pipe(catchError(() => of([]))),
      workers   : this.service.getSupervisoresAc().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ dashboard, proyectos, workers }) => {
        this.proyectos   = proyectos.map((p: any) => ({ id: p.projectId ?? p.id, nombre: p.projectDescription ?? p.nombre }));
        this.arquitectos = workers.map((w: any) => ({ id: w.userId ?? w.id, nombre: w.nombre ?? w.fullName }));
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
    this.kpis               = d.kpis;
    this.alertas            = d.alertas;
    this.supervisores       = d.supervisores       ?? [];
    this.hitosCriticos      = d.hitosCriticos      ?? [];
    this.tareasPorArquitecto= d.tareasPorArquitectoDetalle ?? [];
    this.avanceSemanal      = d.avanceSemanal       ?? [];
    this.eficienciaSpi      = d.eficienciaSpi       ?? [];
    this.cdr.detectChanges();
    this.destruirCharts();
    setTimeout(() => { this.renderCharts(); this.cdr.detectChanges(); }, 50);
  }

  // ─── charts ──────────────────────────────────────────────────
  private destruirCharts() {
    this.avanceChart?.destroy();
    this.eficienciaChart?.destroy();
    this.distribucionChart?.destroy();
    this.tareasChart?.destroy();
  }

  private renderCharts() {
    this.renderAvanceChart();
    this.renderEficienciaChart();
    this.renderDistribucionChart();
    this.renderTareasChart();
  }

  private renderAvanceChart() {
    if (!this.avanceRef?.nativeElement) return;
    const data = this.avanceSemanal;
    this.avanceChart = new Chart(this.avanceRef.nativeElement, {
      type: 'line',
      data: {
        labels: data.map(s => s.semana),
        datasets: [
          {
            label: 'Programado',
            data: data.map(s => s.programado),
            borderColor: '#B0BAD0',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 0,
            tension: 0.3,
          },
          {
            label: 'Real',
            data: data.map(s => s.real),
            borderColor: '#4A7FD4',
            backgroundColor: 'rgba(74,127,212,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#4A7FD4',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
          datalabels: { display: false },
          legend: { position: 'bottom' as const, labels: { boxWidth: 8, font: { size: 9 }, color: '#94A3B8', usePointStyle: true } },
          tooltip: { backgroundColor: '#1E293B', titleFont: { size: 10 }, bodyFont: { size: 10 } },
        },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(200,206,220,0.3)' }, border: { display: false }, ticks: { callback: (v: any) => `${v}%`, font: { size: 9 }, color: '#94A3B8', maxTicksLimit: 5 } },
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94A3B8' } },
        },
      },
    });
  }

  private renderEficienciaChart() {
    if (!this.eficienciaRef?.nativeElement) return;
    const data = this.eficienciaSpi.slice(-6);
    const vals = data.map(s => Number((s.spi * 100).toFixed(1)));
    this.eficienciaChart = new Chart(this.eficienciaRef.nativeElement, {
      type: 'line',
      data: {
        labels: data.map(s => s.semana),
        datasets: [{
          label: 'SPI %',
          data: vals,
          borderColor: '#2D9E5F',
          backgroundColor: 'rgba(45,158,95,0.08)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: vals.map(v => v >= 95 ? '#2D9E5F' : v >= 80 ? '#C4860A' : '#C94040'),
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          datalabels: { anchor: 'end' as const, align: 'end' as const, offset: 2, color: '#64748B', font: { weight: 'bold' as const, size: 9 }, formatter: (v: number) => `${v}%` },
          legend: { display: false },
          tooltip: { backgroundColor: '#1E293B', titleFont: { size: 10 }, bodyFont: { size: 10 } },
        },
        scales: {
          y: { min: 50, max: 130, grid: { color: 'rgba(200,206,220,0.3)' }, border: { display: false }, ticks: { callback: (v: any) => `${v}%`, font: { size: 9 }, color: '#94A3B8', maxTicksLimit: 5 } },
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94A3B8' } },
        },
      },
    });
  }

  private renderDistribucionChart() {
    if (!this.distribucionRef?.nativeElement) return;
    this.distribucionChart = new Chart(this.distribucionRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Culminadas', 'En Proceso', 'Vencidas', 'Pendientes'],
        datasets: [{
          data: [this.kpis.culminadas, this.kpis.enProceso, this.kpis.vencidas, this.kpis.pendientes],
          backgroundColor: ['#2D9E5F', '#4A7FD4', '#C94040', '#C4860A'],
          borderWidth: 3,
          borderColor: '#F7F8FC',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            callbacks: {
              label: (ctx: any) => {
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  private renderTareasChart() {
    if (!this.tareasRef?.nativeElement) return;
    const data = this.tareasPorArquitecto.slice(0, 8);
    const labels = data.map(d => this.primerApellido(d.nombre));
    this.tareasChart = new Chart(this.tareasRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Hitos', data: data.map(d => d.hitos), backgroundColor: '#4A7FD4', borderRadius: 4, stack: 'stack' },
          { label: 'Entregables', data: data.map(d => d.entregables), backgroundColor: '#2D9E5F', borderRadius: 4, stack: 'stack' },
          { label: 'Consultas', data: data.map(d => d.consultas), backgroundColor: '#C4860A', borderRadius: 4, stack: 'stack' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
          datalabels: { display: false },
          legend: { position: 'bottom' as const, labels: { boxWidth: 8, font: { size: 9 }, color: '#94A3B8', usePointStyle: true } },
          tooltip: { backgroundColor: '#1E293B', titleFont: { size: 10 }, bodyFont: { size: 10 } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#94A3B8' } },
          y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(200,206,220,0.3)' }, border: { display: false }, ticks: { precision: 0, font: { size: 9 }, color: '#94A3B8', maxTicksLimit: 5 } },
        },
      },
    });
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

  // ─── helpers UI ──────────────────────────────────────────────
  get promedioEficiencia(): number {
    if (!this.supervisores.length) return 0;
    return Math.round(this.supervisores.reduce((s, x) => s + x.progreso, 0) / this.supervisores.length);
  }

  get equipoEquilibrado(): boolean {
    if (this.supervisores.length < 2) return true;
    const v = this.supervisores.map(s => s.progreso);
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
    if (p >= 75) return '#EAF5EF';
    if (p >= 60) return '#EAF0FB';
    if (p >= 45) return '#FBF3E4';
    return '#FAE9E9';
  }

  getAvatarColor(p: number): string {
    if (p >= 75) return '#2D9E5F';
    if (p >= 60) return '#4A7FD4';
    if (p >= 45) return '#C4860A';
    return '#C94040';
  }

  getComentario(sup: SupervisorProgresoDTO): string {
    if (sup.progreso >= 85) return 'Excelente';
    if (sup.progreso >= 75) return 'Sobre prom.';
    if (sup.progreso >= 60) return 'En promedio';
    if (sup.progreso >= 45) return 'Bajo prom.';
    return 'Crítico';
  }

  getComentarioBg(sup: SupervisorProgresoDTO): string {
    if (sup.progreso >= 75) return '#EAF5EF';
    if (sup.progreso >= 60) return '#EAF0FB';
    if (sup.progreso >= 45) return '#FBF3E4';
    return '#FAE9E9';
  }

  getComentarioColor(sup: SupervisorProgresoDTO): string {
    if (sup.progreso >= 75) return '#2D9E5F';
    if (sup.progreso >= 60) return '#4A7FD4';
    if (sup.progreso >= 45) return '#C4860A';
    return '#C94040';
  }
  getProyectada(p: number)     { return Math.min(100, Math.round(p * 1.12)); }

  getHitoColor(dias: number): string {
    if (dias < 0 || dias <= 3) return '#C0392B';
    if (dias <= 7)             return '#D97706';
    return '#2E6DB4';
  }

  get hitosUrgentesCnt()  { return this.hitosCriticos.filter(h => h.diasRestantes <= 3).length; }
  get hitosEstaSemanaCnt(){ return this.hitosCriticos.filter(h => h.diasRestantes > 3 && h.diasRestantes <= 7).length; }
  get hitosProximosCnt()  { return this.hitosCriticos.filter(h => h.diasRestantes > 7).length; }

  getSubtitulo(): string {
    const n = new Date();
    const mes = n.toLocaleString('es-PE', { month: 'long' });
    const anio = n.getFullYear();
    const w = Math.ceil(((n.getTime() - new Date(anio, 0, 1).getTime()) / 86400000 + new Date(anio, 0, 1).getDay() + 1) / 7);
    return `Semana ${w} · ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`;
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
