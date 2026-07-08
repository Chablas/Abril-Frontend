import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Roles } from '../../../../../core/constants/roles';
import { AdjudicacionesDashboardService } from '../services/adjudicaciones-dashboard.service';
import {
  AdjudicacionesDashboardDTO,
  AdjChartItemDTO,
  AdjDashboardFiltersDTO,
  AdjDashboardFilterValues,
} from '../dtos/adjudicaciones-dashboard.dto';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-adjudicaciones-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './adjudicaciones-dashboard.html',
})
export class AdjudicacionesDashboard implements AfterViewInit {
  data?: AdjudicacionesDashboardDTO;

  /** Catálogos de los filtros (se cargan una sola vez en la primera petición). */
  filterOptions?: AdjDashboardFiltersDTO;

  /** Valores seleccionados en los filtros. */
  filters: AdjDashboardFilterValues = {
    projectId: null,
    contractTypeId: null,
    contractModalityId: null,
    paymentMethodId: null,
    projectSubContractorStatusId: null,
  };

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
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.load(true);
  }

  /**
   * Usuario de Oficina Técnica "puro" (sin ser Admin ni Oficina Central): solo puede
   * ver el dashboard de su(s) proyecto(s) asignado(s) en Configuración → Correo de
   * staff por proyecto. Misma lógica que el backend (RestrictToOwnProjects): el
   * catálogo de proyectos que llega ya viene restringido a los suyos, así que aquí
   * solo bloqueamos el filtro para que no lo puedan cambiar a otro proyecto.
   */
  get projectLocked(): boolean {
    const roles = this.authService.getRoles();
    return (
      roles.includes(Roles.COSTOS_OFICINA_TECNICA) &&
      !roles.includes(Roles.COSTOS_ADMINISTRADOR) &&
      !roles.includes(Roles.COSTOS_OFICINA_CENTRAL)
    );
  }

  /** Aplica los filtros seleccionados y recarga todos los gráficos. */
  applyFilters(): void {
    this.load(false);
  }

  /** Limpia todos los filtros y recarga. */
  clearFilters(): void {
    this.filters = {
      // Oficina Técnica no puede quitar su proyecto: se mantiene bloqueado.
      projectId: this.projectLocked ? this.filterOptions?.projects?.[0]?.id ?? null : null,
      contractTypeId: null,
      contractModalityId: null,
      paymentMethodId: null,
      projectSubContractorStatusId: null,
    };
    this.load(false);
  }

  get hasActiveFilters(): boolean {
    return (
      this.filters.projectId != null ||
      this.filters.contractTypeId != null ||
      this.filters.contractModalityId != null ||
      this.filters.paymentMethodId != null ||
      this.filters.projectSubContractorStatusId != null
    );
  }

  /** @param includeFilters solo true en la primera carga para traer los catálogos de filtros. */
  private load(includeFilters: boolean): void {
    this.loaderService.show();
    this.service.getDashboard(this.filters, includeFilters).subscribe({
      next: (res) => {
        this.data = res;
        if (res.filters) {
          this.filterOptions = res.filters;
          // Oficina Técnica: el catálogo ya viene con solo su(s) proyecto(s).
          // Dejamos el filtro marcado en su proyecto y bloqueado (ver template).
          if (this.projectLocked && res.filters.projects?.length) {
            this.filters.projectId = res.filters.projects[0].id;
          }
        }
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

  /** Aclara un color hex mezclándolo con blanco para obtener un relleno pastel. */
  private pastel(hex: string, amount = 0.6): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const mix = (c: number) => Math.round(c + (255 - c) * amount);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
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
            callbacks: {
              ...(money ? { label: (ctx) => ` ${(ctx.raw as number).toLocaleString('es-PE')}` } : {}),
              // Detalle breve por barra (solo los ítems que traen `items`, hoy porEstado):
              // lista de adjudicaciones en ese estado, recortada para no tapar la pantalla.
              afterBody: (ctxs) => {
                const detail = items[ctxs[0]?.dataIndex ?? -1]?.items;
                if (!detail?.length) return [];
                const max = 10;
                const lines = detail.slice(0, max).map((s) => `• ${s}`);
                if (detail.length > max) lines.push(`… y ${detail.length - max} más`);
                return lines;
              },
            },
            bodyFont: { size: 11 },
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
    const palette = colors ?? this.doughnutColors;
    Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: total ? items.map((i) => i.label) : ['Sin datos'],
        datasets: [
          {
            data: total ? items.map((i) => i.value) : [1],
            // Relleno pastel + borde fuerte del mismo color (igual que las barras).
            backgroundColor: total
              ? items.map((_, idx) => this.pastel(palette[idx % palette.length]))
              : ['#F1F3F7'],
            borderColor: total
              ? items.map((_, idx) => palette[idx % palette.length])
              : ['#D9DEE8'],
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
            color: '#475569',
            font: { weight: 'bold', size: 11 },
            formatter: (v: number) => (v > 0 ? v : ''),
          },
        },
      },
    });
  }

  // ── PDF ──────────────────────────────────────────────────────────────────

  /** Imagen base64 de un gráfico a partir del id de su canvas (o null si no existe). */
  private chartImage(canvasId: string): string | null {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return null;
    return Chart.getChart(canvas)?.toBase64Image() ?? null;
  }

  /** Dibuja la cuadrícula de tarjetas resumen (6 KPIs) en el PDF y devuelve la Y siguiente. */
  private drawSummaryCards(pdf: jsPDF, startY: number, marginX: number, usableWidth: number): number {
    const s = this.data?.summary;
    const nf = (v: number) => (v ?? 0).toLocaleString('es-PE');

    const cards: { label: string; value: string; rgb: [number, number, number] }[] = [
      { label: 'Total', value: nf(s?.total ?? 0), rgb: [31, 41, 55] },
      { label: 'En proceso', value: nf(s?.enProceso ?? 0), rgb: [0, 134, 165] },
      { label: 'Completadas', value: nf(s?.completadas ?? 0), rgb: [100, 188, 4] },
      { label: 'Proyectos', value: nf(s?.totalProyectos ?? 0), rgb: [31, 41, 55] },
      { label: 'Monto S/.', value: nf(s?.montoPenTotal ?? 0), rgb: [80, 150, 3] },
      { label: 'Monto $', value: nf(s?.montoUsdTotal ?? 0), rgb: [80, 150, 3] },
    ];

    const cols = 6;
    const gap = 4;
    const cardW = (usableWidth - gap * (cols - 1)) / cols;
    const cardH = 17;

    cards.forEach((c, i) => {
      const x = marginX + i * (cardW + gap);
      const y = startY;

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(pdf.splitTextToSize(c.label, cardW - 6)[0], x + 3, y + 5);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(c.rgb[0], c.rgb[1], c.rgb[2]);
      pdf.setFontSize(13);
      pdf.text(pdf.splitTextToSize(c.value, cardW - 6)[0], x + 3, y + 12);
    });

    pdf.setTextColor(0, 0, 0);
    return startY + cardH + 8;
  }

  private generatePDF(): jsPDF {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const marginX = 10;
    const usableWidth = 210 - marginX * 2;
    const halfWidth = usableWidth / 2;
    const thirdWidth = usableWidth / 3;
    const pageHeight = 297;
    const chartHeight = 55;
    let currentY = 10;

    const ensureSpace = (needed: number) => {
      if (currentY + needed > pageHeight - 10) {
        pdf.addPage();
        currentY = 10;
      }
    };

    autoTable(pdf, {
      startY: 10,
      theme: 'grid',
      styles: { halign: 'center', valign: 'middle', fontSize: 10 },
      tableWidth: usableWidth,
      body: [
        [
          { content: 'DASHBOARD DE ADJUDICACIONES\nCOSTOS', styles: { fontSize: 14, fontStyle: 'bold' } },
          { content: 'Fecha: ' + new Date().toLocaleDateString() },
        ],
      ],
    });
    currentY = (pdf as any).lastAutoTable.finalY + 8;

    currentY = this.drawSummaryCards(pdf, currentY, marginX, usableWidth);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);

    // Fila 1: estado / tendencia / proyecto (3 columnas)
    const row1 = [
      { id: 'chart-estado', title: 'ADJUDICACIONES POR ESTADO' },
      { id: 'chart-mes', title: 'TENDENCIA MENSUAL' },
      { id: 'chart-proyecto', title: 'ADJUDICACIONES POR PROYECTO' },
    ];
    ensureSpace(chartHeight + 6);
    row1.forEach((c, i) => {
      pdf.text(c.title, marginX + thirdWidth * i + thirdWidth / 2, currentY, { align: 'center' });
    });
    row1.forEach((c, i) => {
      const img = this.chartImage(c.id);
      if (img) pdf.addImage(img, 'PNG', marginX + thirdWidth * i, currentY + 2, thirdWidth, chartHeight);
    });
    currentY += chartHeight + 10;

    // Distribuciones (donas) en filas de 2
    const dist = [
      { id: 'chart-modalidad', title: 'POR MODALIDAD DE CONTRATO' },
      { id: 'chart-categoria', title: 'POR CATEGORÍA DE PARTIDA' },
      { id: 'chart-tipo', title: 'POR TIPO DE CONTRATO' },
      { id: 'chart-modalidad-pago', title: 'POR MODALIDAD DE PAGO' },
      { id: 'chart-observaciones', title: 'LLEGADA A OF. CENTRAL (PASO 5)' },
    ];
    for (let i = 0; i < dist.length; i += 2) {
      const pair = dist.slice(i, i + 2);
      ensureSpace(chartHeight + 6);
      pair.forEach((c, j) => {
        pdf.text(c.title, marginX + halfWidth * j + halfWidth / 2, currentY, { align: 'center' });
      });
      pair.forEach((c, j) => {
        const img = this.chartImage(c.id);
        if (img) pdf.addImage(img, 'PNG', marginX + halfWidth * j, currentY + 2, halfWidth, chartHeight);
      });
      currentY += chartHeight + 10;
    }

    // Rankings (barras horizontales) en filas de 2 + ancho completo
    const rankPair = [
      { id: 'chart-top-pen', title: 'TOP SUBCONTRATISTAS POR MONTO (S/.)' },
      { id: 'chart-top-usd', title: 'TOP SUBCONTRATISTAS POR MONTO ($)' },
    ];
    ensureSpace(chartHeight + 6);
    rankPair.forEach((c, j) => {
      pdf.text(c.title, marginX + halfWidth * j + halfWidth / 2, currentY, { align: 'center' });
    });
    rankPair.forEach((c, j) => {
      const img = this.chartImage(c.id);
      if (img) pdf.addImage(img, 'PNG', marginX + halfWidth * j, currentY + 2, halfWidth, chartHeight);
    });
    currentY += chartHeight + 10;

    ensureSpace(chartHeight + 6);
    pdf.text('TOP SUBCONTRATISTAS MÁS ADJUDICADOS', 105, currentY, { align: 'center' });
    const topImg = this.chartImage('chart-top-contratistas');
    if (topImg) pdf.addImage(topImg, 'PNG', marginX, currentY + 2, usableWidth, chartHeight);

    return pdf;
  }

  downloadPDF(): void {
    this.generatePDF().save('Dashboard-Adjudicaciones.pdf');
  }
}
