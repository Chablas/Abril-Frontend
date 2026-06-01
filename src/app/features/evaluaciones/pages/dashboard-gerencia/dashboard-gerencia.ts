import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EvDashboardService } from '../../services/ev-dashboard.service';
import { EvPeriodoService } from '../../services/ev-periodo.service';
import { EvDashboardGerenciaDto, EvResidenteResumenDto } from '../../dtos/ev-dashboard.model';
import { EvPeriodoDto } from '../../dtos/ev-periodo.model';

@Component({
  selector: 'app-dashboard-gerencia',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-gerencia.html',
  styleUrl: './dashboard-gerencia.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGerencia implements OnInit, AfterViewInit {
  periodo: EvPeriodoDto | null = null;
  dashboard: EvDashboardGerenciaDto | null = null;
  loading = true;
  residenteActivo: EvResidenteResumenDto | null = null;
  vistaActiva: 'mensual' | 'historico' | 'tendencia' = 'mensual';
  mostrarDetalleArea = false;
  areaSeleccionada: string | null = null;
  chartBarrasId = 'chart-barras-ev';
  chartTendenciaId = 'chart-tendencia-ev';

  private readonly COLORES = [
    { bg: '#DCFCE7', border: '#059669' },
    { bg: '#DBEAFE', border: '#0284C7' },
    { bg: '#EDE9FE', border: '#7C3AED' },
    { bg: '#FEF3C7', border: '#D97706' },
    { bg: '#FEE2E2', border: '#DC2626' },
    { bg: '#E0F2FE', border: '#0369A1' },
    { bg: '#FCE7F3', border: '#BE185D' },
  ];
  private color(i: number) { return this.COLORES[i % this.COLORES.length]; }

  constructor(
    private dashService: EvDashboardService,
    private periodoService: EvPeriodoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    if (this.dashboard) {
      setTimeout(() => this.renderCharts(), 50);
    }
  }

  ngOnInit(): void {
    this.periodoService.getActivo().subscribe({
      next: (p) => {
        this.periodo = p;
        this.loadDashboard(p.id);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadDashboard(periodoId: number): void {
    this.dashService.getGerencia(periodoId).subscribe({
      next: (d) => {
        this.dashboard = d;
        this.residenteActivo = d.residentes[0] ?? null;
        this.loading = false;
        console.log('tendencia:', d.tendencia);
        this.cdr.markForCheck();
        setTimeout(() => this.renderCharts(), 100);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectResidente(r: EvResidenteResumenDto): void {
    this.residenteActivo = r;
    this.cdr.markForCheck();
    setTimeout(() => this.renderCharts(), 100);
  }

  get pctCompletitud(): number {
    if (!this.dashboard || !this.dashboard.evaluacionesEsperadas) return 0;
    return Math.round(
      (this.dashboard.evaluacionesCompletadas / this.dashboard.evaluacionesEsperadas) * 100,
    );
  }

  scoreColor(nota: number | null): string {
    if (nota === null) return '#6B7280';
    if (nota >= 16) return '#059669';
    if (nota >= 12) return '#D97706';
    return '#DC2626';
  }

  scoreClass(nota: number | null): string {
    if (nota === null) return 'score-eq';
    if (nota >= 16) return 'score-hi';
    if (nota >= 12) return 'score-ok';
    return 'score-lo';
  }

  areaColor(nota: number | null): string {
    if (nota === null) return '#1e2d45';
    if (nota >= 16) return '#14532d22';
    if (nota >= 12) return '#451a0322';
    return '#450a0a22';
  }

  areaBorderColor(nota: number | null): string {
    if (nota === null) return '#1e2d45';
    if (nota >= 16) return '#14532d';
    if (nota >= 12) return '#451a03';
    return '#450a0a';
  }

  areaTextColor(nota: number | null): string {
    if (nota === null) return '#475569';
    if (nota >= 16) return '#4ade80';
    if (nota >= 12) return '#fbbf24';
    return '#f87171';
  }

  tendencia(r: EvResidenteResumenDto): string {
    if (!r.promedioMesAnterior || !r.promedioGeneral) return 'eq';
    const diff = r.promedioGeneral - r.promedioMesAnterior;
    if (diff > 0) return 'up';
    if (diff < 0) return 'dn';
    return 'eq';
  }

  diffMes(r: EvResidenteResumenDto): string {
    if (!r.promedioMesAnterior || !r.promedioGeneral) return '—';
    const diff = r.promedioGeneral - r.promedioMesAnterior;
    return (diff >= 0 ? '+' : '') + diff.toFixed(1);
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  avatarColor(idx: number): string {
    const colors = ['#EEF2FF', '#F0F9FF', '#FAF5FF', '#F9FAFB', '#FEF2F2'];
    return colors[idx % colors.length];
  }

  avatarTextColor(idx: number): string {
    const colors = ['#4338CA', '#0369A1', '#7E22CE', '#374151', '#991B1B'];
    return colors[idx % colors.length];
  }

  getDetallesPorArea(evaluaciones: any[], area: string): any[] {
    return evaluaciones.filter((e) => e.areaNombre === area);
  }

  renderCharts(): void {
    if (!this.dashboard) return;
    this.renderBarras();
    this.renderTendencia();
  }

  private renderBarras(): void {
    const canvasEl = document.getElementById(this.chartBarrasId) as HTMLCanvasElement;
    if (!canvasEl || !this.dashboard) return;
    const existing = Chart.getChart(canvasEl);
    if (existing) existing.destroy();
    const residentes = this.dashboard.residentes;
    new Chart(canvasEl, {
      type: 'bar',
      data: {
        labels: residentes.map((r) => r.nombre),
        datasets: [
          {
            label: this.periodo?.nombreMes ?? 'Actual',
            data: residentes.map((r) => r.promedioGeneral ?? 0),
            backgroundColor: residentes.map((_, i) => this.color(i).bg),
            borderColor: residentes.map((_, i) => this.color(i).border),
            borderWidth: 1.5,
            borderRadius: 5,
          },
          {
            label: 'Mes anterior',
            data: residentes.map((r) => r.promedioMesAnterior ?? 0),
            backgroundColor: residentes.map((_, i) => this.color(i).bg + '99'),
            borderColor: residentes.map((_, i) => this.color(i).border + '66'),
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#6B7280', font: { size: 9 }, boxWidth: 10, padding: 8 },
          },
        },
        scales: {
          x: { grid: { color: '#F3F4F6' }, ticks: { color: '#9CA3AF', font: { size: 8 } } },
          y: {
            min: 0,
            max: 20,
            grid: { color: '#F3F4F6' },
            ticks: { color: '#9CA3AF', font: { size: 8 }, stepSize: 5 },
          },
        },
      },
    });
  }

  private renderTendencia(): void {
    const canvasEl = document.getElementById(this.chartTendenciaId) as HTMLCanvasElement;
    if (!canvasEl || !this.dashboard) return;
    const existing = Chart.getChart(canvasEl);
    if (existing) existing.destroy();
    const tendencia = this.dashboard.tendencia;
    const meses = [...new Set(tendencia.map((t) => t.nombreMes))];
    const userIds = [...new Set(tendencia.map((t) => t.userId))];
    const datasets = userIds.map((uid, idx) => {
      const r = this.dashboard!.residentes.find((r) => r.userId === uid);
      const nombre = r?.nombre ?? `User ${uid}`;
      return {
        label: nombre,
        data: meses.map(
          (m) => tendencia.find((t) => t.userId === uid && t.nombreMes === m)?.promedio ?? null,
        ),
        borderColor: this.color(idx).border,
        backgroundColor: this.color(idx).bg + '33',
        borderWidth: 1.5,
        pointRadius: 2,
        tension: 0.4,
        fill: false,
        spanGaps: true,
      };
    });
    new Chart(canvasEl, {
      type: 'line',
      data: { labels: meses, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#6B7280', font: { size: 9 }, boxWidth: 10, padding: 8 },
          },
        },
        scales: {
          x: { grid: { color: '#F3F4F6' }, ticks: { color: '#9CA3AF', font: { size: 8 } } },
          y: {
            min: 0,
            max: 20,
            grid: { color: '#F3F4F6' },
            ticks: { color: '#9CA3AF', font: { size: 8 }, stepSize: 5 },
          },
        },
      },
    });
  }
}
