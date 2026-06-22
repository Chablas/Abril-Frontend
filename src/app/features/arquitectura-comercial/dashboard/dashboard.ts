import {
  Component, AfterViewInit, ChangeDetectorRef,
  ElementRef, ViewChild, OnDestroy,
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels    from 'chartjs-plugin-datalabels';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of }   from 'rxjs';
import { catchError }     from 'rxjs/operators';
import { Router }        from '@angular/router';
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
  CategoriaDashboardItemDTO,
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
  imports    : [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './dashboard.html',
  styleUrl   : './dashboard.css',
})
export class Dashboard implements AfterViewInit, OnDestroy {

  anioActual = new Date().getFullYear();

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
  supervisores            : SupervisorProgresoDTO[]     = [];
  hitosCriticos           : HitoCriticoDTO[]            = [];
  tareasPorArquitecto     : TareasPorArquitectoDTO[]    = [];
  avanceSemanal           : AvanceSemanalDTO[]          = [];
  eficienciaSpi           : EficienciaSpiDTO[]          = [];
  categorias              : CategoriaItemDTO[]          = [];
  distribucionPorCategoria: CategoriaDashboardItemDTO[] = [];

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

  @ViewChild('avanceCanvas')     avanceRef    !: ElementRef<HTMLCanvasElement>;
  @ViewChild('eficienciaCanvas') eficienciaRef!: ElementRef<HTMLCanvasElement>;

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
    this.kpis                    = d.kpis;
    this.alertas                 = d.alertas;
    this.supervisores            = d.supervisores            ?? [];
    this.hitosCriticos           = d.hitosCriticos           ?? [];
    this.tareasPorArquitecto     = d.tareasPorArquitectoDetalle ?? [];
    this.avanceSemanal           = d.avanceSemanal            ?? [];
    this.eficienciaSpi           = d.eficienciaSpi            ?? [];
    this.distribucionPorCategoria= d.distribucionPorCategoria ?? [];
    this.cdr.detectChanges();
    this.destruirCharts();
    setTimeout(() => { this.renderCharts(); this.cdr.detectChanges(); }, 50);
  }

  // ─── charts ──────────────────────────────────────────────────
  private destruirCharts() {
    this.avanceChart?.destroy();
    this.eficienciaChart?.destroy();
  }

  private renderCharts() {
    this.renderAvanceChart();
    this.renderEficienciaChart();
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

  // ─── supervisor / carga helpers ──────────────────────────────
  get tareasPorArquitectoOrdenado(): TareasPorArquitectoDTO[] {
    return [...this.tareasPorArquitecto].sort((a, b) => b.total - a.total);
  }

  filtrarPorSupervisor(userId: number) {
    this.filtro.userId = this.filtro.userId === userId ? null : userId;
    this.buscar();
  }

  get cargaStats() {
    const d = this.tareasPorArquitectoOrdenado;
    if (!d.length) return null;
    const totales = d.map(s => s.total);
    const max  = Math.max(...totales);
    const sum  = totales.reduce((a, b) => a + b, 0);
    const avg  = Math.round(sum / d.length);
    const avgPct = max > 0 ? avg / max * 100 : 0;
    return { max, avg, avgPct };
  }

  cargaBarPct(total: number): number {
    const s = this.cargaStats;
    return s && s.max > 0 ? Math.round(total / s.max * 100) : 0;
  }

  cargaTag(total: number): string {
    const s = this.cargaStats;
    if (!s) return '';
    if (total > s.avg * 1.3) return 'Sobrecargado';
    if (total < s.avg * 0.7) return 'Disponible';
    return 'Normal';
  }

  cargaTagStyle(total: number): { bg: string; color: string } {
    const s = this.cargaStats;
    if (!s) return { bg: '#F1F5F9', color: '#64748B' };
    if (total > s.avg * 1.3) return { bg: '#FEE2E2', color: '#DC2626' };
    if (total < s.avg * 0.7) return { bg: '#D1FAE5', color: '#059669' };
    return { bg: '#DBEAFE', color: '#2563EB' };
  }

  cargaBarGradient(total: number): string {
    const s = this.cargaStats;
    if (!s) return '#CBD5E1';
    if (total > s.avg * 1.3) return 'linear-gradient(90deg,#F87171,#DC2626)';
    if (total < s.avg * 0.7) return 'linear-gradient(90deg,#4ADE80,#16A34A)';
    return 'linear-gradient(90deg,#60A5FA,#2563EB)';
  }

  get cargaInsights(): string[] {
    const d = this.tareasPorArquitectoOrdenado;
    const s = this.cargaStats;
    if (!s || !d.length) return [];
    const out: string[] = [];

    const masCargado   = d[0];
    const menosCargado = d[d.length - 1];
    const sobrecargados = d.filter(x => x.total > s.avg * 1.3);
    const disponibles   = d.filter(x => x.total < s.avg * 0.7);

    sobrecargados.forEach(x => {
      out.push(`🔴 ${this.primerApellido(x.nombre)} tiene ${x.total} act. (media ${s.avg}) — redistribuir urgente`);
    });
    disponibles.forEach(x => {
      out.push(`🟢 ${this.primerApellido(x.nombre)} tiene capacidad — asignar actividades`);
    });

    const brecha = masCargado.total - menosCargado.total;
    if (brecha > s.avg * 0.5) {
      out.push(`⚖️ Brecha de ${brecha} act. entre ${this.primerApellido(masCargado.nombre)} y ${this.primerApellido(menosCargado.nombre)}`);
    }
    if (!out.length) {
      out.push(`✅ Carga equilibrada (media ${s.avg} act. por supervisor)`);
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

  get rankingInsights(): string[] {
    if (!this.supervisores.length) return [];
    const sorted = [...this.supervisores].sort((a, b) => b.progreso - a.progreso);
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