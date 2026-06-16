import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AdjudicacionesDashboardService } from '../services/adjudicaciones-dashboard.service';
import {
  AdjudicacionesDashboardDTO,
  AdjChartItemDTO,
} from '../dtos/adjudicaciones-dashboard.dto';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-adjudicaciones-dashboard',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './adjudicaciones-dashboard.html',
})
export class AdjudicacionesDashboard implements AfterViewInit {
  data?: AdjudicacionesDashboardDTO;

  /** Paleta verde de la app para barras/donas. */
  private readonly greens = [
    '#64BC04', '#83c936', '#a2d768', '#509603', '#3c7102', '#c1e49b',
    '#74c31d', '#284b02', '#b2de82', '#1e3801',
  ];
  private readonly doughnutColors = ['#64BC04', '#0086A5', '#F9A826', '#C7CEEA', '#F6C1CC', '#83c936', '#15445C'];

  constructor(
    private service: AdjudicacionesDashboardService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.load();
  }

  private load(): void {
    this.loaderService.show();
    this.service.getDashboard().subscribe({
      next: (res) => {
        this.data = res;
        this.loaderService.hide();
        this.cdr.detectChanges();
        setTimeout(() => this.renderAll());
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private renderAll(): void {
    if (!this.data) return;
    this.barChart('chart-estado', this.data.porEstado, '#0086A5', '#CFEAF1', true);
    this.lineChart('chart-mes', this.data.porMes);
    this.barChart('chart-proyecto', this.data.porProyecto, '#64BC04', '#E5F7D1', true);
    this.doughnut('chart-tipo', this.data.porTipoContrato);
    this.doughnut('chart-categoria', this.data.porCategoria);
    this.doughnut('chart-modalidad', this.data.porModalidad);
    this.doughnut('chart-modalidad-pago', this.data.porModalidadPago);
    // Con observaciones (rojo) vs sin observaciones (verde).
    this.doughnut('chart-observaciones', this.data.llegadaObservaciones, ['#D30000', '#64BC04']);
    // Rankings (barras horizontales).
    this.barChart('chart-top-pen', this.data.topSubcontratistasPen, '#509603', '#E5F7D1', true, true);
    this.barChart('chart-top-usd', this.data.topSubcontratistasUsd, '#0086A5', '#CFEAF1', true, true);
    this.barChart('chart-top-contratistas', this.data.topContratistas, '#64BC04', '#E5F7D1', true);
  }

  /** Formato de monto compacto para etiquetas (1.2K, 3.4M). */
  private formatMoney(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(v);
  }

  // ── Charts ───────────────────────────────────────────────────────────────

  private barChart(
    canvasId: string,
    items: AdjChartItemDTO[],
    border: string,
    bg: string,
    horizontal: boolean,
    money = false,
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((i) => i.label),
        datasets: [
          { label: 'Adjudicaciones', data: items.map((i) => i.value), backgroundColor: bg, borderColor: border, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        layout: { padding: { right: money ? 28 : 8 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: money
              ? { label: (ctx) => ` ${(ctx.raw as number).toLocaleString('es-PE')}` }
              : {},
          },
          datalabels: {
            color: '#5b6470',
            font: { weight: 'bold', size: 11 },
            anchor: 'end',
            align: horizontal ? 'right' : 'top',
            offset: 2,
            formatter: (v: number) => (v > 0 ? (money ? this.formatMoney(v) : v) : ''),
          },
        },
        scales: horizontal
          ? { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { ticks: { font: { size: 10 } } } }
          : { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  private lineChart(canvasId: string, items: AdjChartItemDTO[]): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: items.map((i) => i.label),
        datasets: [
          {
            label: 'Adjudicaciones creadas',
            data: items.map((i) => i.value),
            backgroundColor: 'rgba(100, 188, 4, 0.12)',
            borderColor: '#64BC04',
            borderWidth: 2,
            pointBackgroundColor: '#64BC04',
            pointRadius: 3,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#509603',
            anchor: 'end',
            align: 'top',
            offset: 3,
            font: { weight: 'bold', size: 10 },
            formatter: (v: number) => (v > 0 ? v : ''),
          },
        },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  private doughnut(canvasId: string, items: AdjChartItemDTO[], colors?: string[]): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const total = items.reduce((s, i) => s + i.value, 0);
    Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: total ? items.map((i) => i.label) : ['Sin datos'],
        datasets: [
          {
            data: total ? items.map((i) => i.value) : [1],
            backgroundColor: total ? (colors ?? this.doughnutColors) : ['#EEF1F4'],
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        layout: { padding: 6 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 8, font: { size: 10 } },
          },
          tooltip: { enabled: total > 0 },
          datalabels: {
            display: total > 0,
            color: '#ffffff',
            font: { weight: 'bold', size: 11 },
            formatter: (v: number) => (v > 0 ? v : ''),
          },
        },
      },
    });
  }
}
