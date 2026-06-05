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
      type: 'bar',
      data: {
        labels  : data.map(s => s.semana),
        datasets: [
          {
            label          : 'Programado %',
            data           : data.map(s => s.programado),
            backgroundColor: 'rgba(147,197,253,0.5)',
            borderColor    : '#2E6DB4',
            borderWidth    : 1,
            borderRadius   : 4,
          },
          {
            label          : 'Real %',
            data           : data.map(s => s.real),
            backgroundColor: 'rgba(27,107,58,0.75)',
            borderColor    : '#1B6B3A',
            borderWidth    : 1,
            borderRadius   : 4,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          datalabels: { display: false },
          legend    : { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  private renderEficienciaChart() {
    if (!this.eficienciaRef?.nativeElement) return;
    const data = this.eficienciaSpi.slice(-3);
    this.eficienciaChart = new Chart(this.eficienciaRef.nativeElement, {
      type: 'line',
      data: {
        labels  : data.map(s => s.semana),
        datasets: [{
          label          : 'SPI Promedio',
          data           : data.map(s => Number((s.spi * 100).toFixed(1))),
          borderColor    : '#2E6DB4',
          backgroundColor: 'rgba(46,109,180,0.12)',
          borderWidth    : 2,
          pointRadius    : 5,
          pointBackgroundColor: '#2E6DB4',
          fill           : true,
          tension        : 0.4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          datalabels: {
            anchor: 'end', align: 'end', color: '#1E3A5F',
            font: { weight: 'bold', size: 11 },
            formatter: v => `${v}%`,
          },
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true, max: 130,
            ticks: { callback: v => `${v}%`, font: { size: 10 } },
          },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  private renderDistribucionChart() {
    if (!this.distribucionRef?.nativeElement) return;
    this.distribucionChart = new Chart(this.distribucionRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels  : ['Culminadas', 'En Proceso', 'Vencidas', 'Pendientes'],
        datasets: [{
          data           : [this.kpis.culminadas, this.kpis.enProceso, this.kpis.vencidas, this.kpis.pendientes],
          backgroundColor: ['#1B6B3A', '#2E6DB4', '#C0392B', '#D97706'],
          borderWidth    : 2,
          borderColor    : '#fff',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend    : { display: false },
          datalabels: {
            color: '#fff', font: { weight: 'bold', size: 11 },
            formatter: v => v > 0 ? v : '',
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
          {
            label          : 'Hitos',
            data           : data.map(d => d.hitos),
            backgroundColor: '#2E6DB4',
            borderRadius   : 3,
            stack          : 'stack',
          },
          {
            label          : 'Entregables',
            data           : data.map(d => d.entregables),
            backgroundColor: '#1B6B3A',
            borderRadius   : 3,
            stack          : 'stack',
          },
          {
            label          : 'Consultas',
            data           : data.map(d => d.consultas),
            backgroundColor: '#D97706',
            borderRadius   : 3,
            stack          : 'stack',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          datalabels: { display: false },
          legend    : { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 } } },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
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

  getAvatarBg(p: number)        { return p >= 80 ? '#D1FAE5' : p >= 60 ? '#DBEAFE' : '#FEE2E2'; }
  getAvatarColor(p: number)     { return p >= 80 ? '#1B6B3A' : p >= 60 ? '#2E6DB4' : '#C0392B'; }

  getComentario(sup: SupervisorProgresoDTO): string {
    const d = sup.progreso - this.promedioEficiencia;
    if (sup.progreso >= 90) return 'Top equipo';
    if (d >= 15) return `+${Math.round(d)}pp`;
    if (d >= 5)  return 'Sobre prom.';
    if (d >= -5) return 'En promedio';
    if (d >= -15)return 'Bajo prom.';
    return 'Crítico';
  }
  getComentarioBg(sup: SupervisorProgresoDTO)    { const d = sup.progreso - this.promedioEficiencia; return d >= 5 ? '#D1FAE5' : d >= -5 ? '#DBEAFE' : '#FEE2E2'; }
  getComentarioColor(sup: SupervisorProgresoDTO) { const d = sup.progreso - this.promedioEficiencia; return d >= 5 ? '#1B6B3A' : d >= -5 ? '#2E6DB4' : '#C0392B'; }
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
