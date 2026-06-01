import {
  Component,
  AfterViewInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { LessonsDashboardService } from '../services/lessons-dashboard.service';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  LessonsDashboardDataDTO,
  LessonsDashboardFiltersDTO,
  PhaseStageChartDTO,
  SelectedDashboardFilters,
} from '../dtos/dashboard.model';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-lessons-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './lessons-dashboard.html',
  styleUrl: './lessons-dashboard.css',
})
export class LessonsDashboard implements AfterViewInit {
  trendChart?: Chart;
  barChart?: Chart;
  pieChart?: Chart;
  lineChart?: Chart;
  phaseStageCharts: PhaseStageChartDTO[] = [];

  readonly colors = [
    '#d1ebb4', '#c1e49b', '#b2de82', '#a2d768', '#93d04f', '#83c936',
    '#74c31d', '#5aa904', '#509603', '#468403', '#3c7102', '#325e02',
    '#284b02', '#1e3801', '#142601', '#0a1300',
  ];
  readonly doughnutColors = ['#D4F0C2', '#BEE7E8', '#C7CEEA', '#F9D8A6', '#FFF1A8', '#F6C1CC'];

  data?: LessonsDashboardDataDTO;
  filters: LessonsDashboardFiltersDTO = { periods: [], users: [], areas: [] };
  selected: SelectedDashboardFilters = { periodDate: null, userId: 0, lessonAreaId: 0 };

  // Opciones de período preformateadas para el search-select (value = 'yyyy-MM-dd', label = 'MM-yyyy').
  periodOptions: { value: string; label: string }[] = [];

  @ViewChild('lessonsTrendChart') lessonsTrendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsChart') lessonsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsPieChart') lessonsPieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsLineChart') lessonsLineChartRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private dashboardService: LessonsDashboardService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit() {
    this.loadInitial();
  }

  private loadInitial() {
    this.loaderService.show();
    forkJoin({
      data: this.dashboardService.getData(this.selected),
      filters: this.dashboardService.getFilters(),
    }).subscribe({
      next: ({ data, filters }) => {
        this.filters = filters;
        this.periodOptions = (filters.periods ?? [])
          .filter((p) => p.periodDate)
          .map((p) => ({
            value: formatDate(p.periodDate!, 'yyyy-MM-dd', 'es-PE'),
            label: formatDate(p.periodDate!, 'MM-yyyy', 'es-PE'),
          }));
        this.render(data);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  loadDashboard() {
    this.loaderService.show();
    this.dashboardService.getData(this.selected).subscribe({
      next: (data) => {
        this.render(data);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private render(data: LessonsDashboardDataDTO) {
    this.data = data;
    this.phaseStageCharts = data.lessonsByPhaseAndStage ?? [];
    this.createTrendChart(data);
    this.createBarChart(data);
    this.createPieChart(data);
    this.createLineChart(data);
    setTimeout(() => this.createPhaseStageCharts(this.phaseStageCharts));
    this.cdr.detectChanges();
  }

  // ── Charts ───────────────────────────────────────────────────────────────

  private createTrendChart(data: LessonsDashboardDataDTO) {
    this.trendChart?.destroy();
    const trend = data.lessonsByMonth ?? [];
    this.trendChart = new Chart(this.lessonsTrendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: trend.map((x) => x.label),
        datasets: [
          {
            label: 'Lecciones registradas',
            data: trend.map((x) => x.value),
            backgroundColor: 'rgba(100, 188, 4, 0.12)',
            borderColor: '#64BC04',
            borderWidth: 2,
            pointBackgroundColor: '#64BC04',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          datalabels: {
            display: true,
            color: '#509603',
            anchor: 'end',
            align: 'top',
            offset: 4,
            font: { weight: 'bold', size: 11 },
            formatter: (v) => v,
          },
        },
        scales: { y: { ticks: { precision: 0 }, beginAtZero: true } },
      },
    });
  }

  private createBarChart(data: LessonsDashboardDataDTO) {
    this.barChart?.destroy();
    const sorted = [...data.lessonsByProject].sort((a, b) => b.value - a.value);
    this.barChart = new Chart(this.lessonsChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map((x) => x.label),
        datasets: [
          {
            label: 'Lecciones aprendidas',
            data: sorted.map((x) => x.value),
            backgroundColor: '#E5F7D1',
            borderColor: '#64BC04',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            color: '#828282',
            formatter: (v) => v,
            font: { weight: 'bold', size: 12 },
            anchor: 'end',
            align: 'right',
            offset: 4,
          },
          legend: { position: 'bottom' },
        },
        scales: { x: { ticks: { precision: 0 }, beginAtZero: true } },
      },
    });
  }

  private createPieChart(data: LessonsDashboardDataDTO) {
    this.pieChart?.destroy();
    const sorted = [...data.lessonsByPhase].sort((a, b) => b.value - a.value);
    this.pieChart = new Chart(this.lessonsPieChartRef.nativeElement, {
      type: 'pie',
      data: {
        labels: sorted.map((x) => x.label),
        datasets: [{ data: sorted.map((x) => x.value), backgroundColor: this.colors }],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          datalabels: { color: '#828282', formatter: (v) => v, font: { weight: 'bold', size: 12 } },
          legend: { position: 'bottom' },
        },
      },
    });
  }

  private createLineChart(data: LessonsDashboardDataDTO) {
    this.lineChart?.destroy();
    const sorted = [...data.lessonsBySubStage].sort((a, b) => b.value - a.value);
    this.lineChart = new Chart(this.lessonsLineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: sorted.map((x) => x.label),
        datasets: [
          {
            label: 'Lecciones aprendidas',
            data: sorted.map((x) => x.value),
            backgroundColor: '#E5F7D1',
            borderColor: '#64BC04',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          datalabels: { display: true, anchor: 'end', align: 'top', offset: 3 },
        },
        scales: { y: { ticks: { precision: 0 }, beginAtZero: true } },
      },
    });
  }

  private createPhaseStageCharts(data: PhaseStageChartDTO[]) {
    data.forEach((phase) => {
      const canvas = document.getElementById(`phaseChart-${phase.phaseId}`) as HTMLCanvasElement;
      if (!canvas) return;

      const hasData = phase.stages.length > 0;
      const labels = hasData ? phase.stages.map((s) => s.label) : ['Sin datos'];
      const values = hasData ? phase.stages.map((s) => s.value) : [1];
      const bg = hasData ? this.doughnutColors.slice(0, values.length) : ['#EEF1F4'];

      // Texto "Sin datos" centrado para fases sin lecciones (al filtrar por área).
      const emptyTextPlugin = {
        id: 'emptyText',
        afterDraw(chart: any) {
          if (hasData) return;
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.font = 'bold 13px sans-serif';
          ctx.fillStyle = '#9CA3AF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Sin datos', width / 2, height / 2);
          ctx.restore();
        },
      };

      Chart.getChart(canvas)?.destroy();
      new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: bg, borderColor: bg, borderWidth: 2 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: hasData },
            datalabels: {
              display: hasData,
              color: '#828282',
              formatter: (value: number, ctx: any) => `${ctx.chart.data.labels?.[ctx.dataIndex]}: ${value}`,
              font: { size: 11, weight: 'bold' },
            },
          },
        },
        plugins: hasData ? [] : [emptyTextPlugin],
      });
    });
  }

  // ── PDF ──────────────────────────────────────────────────────────────────

  private generatePDF(): jsPDF {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const marginX = 10;
    const usableWidth = 210 - marginX * 2;
    const halfWidth = usableWidth / 2;
    const chartHeight = 60;
    let currentY = 10;

    autoTable(pdf, {
      startY: 10,
      theme: 'grid',
      styles: { halign: 'center', valign: 'middle', fontSize: 10 },
      tableWidth: 190,
      body: [
        [
          { content: 'DASHBOARD DE LECCIONES APRENDIDAS\nUNIDAD DE PROYECTOS', styles: { fontSize: 14, fontStyle: 'bold' } },
          { content: 'Fecha: ' + new Date().toLocaleDateString() },
        ],
      ],
    });
    currentY = (pdf as any).lastAutoTable.finalY + 8;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');

    // Tendencia mensual (ancho completo)
    if (this.trendChart) {
      pdf.text('TENDENCIA MENSUAL DE LECCIONES', 105, currentY, { align: 'center' });
      currentY += 2;
      pdf.addImage(this.trendChart.toBase64Image(), 'PNG', marginX, currentY, usableWidth, 50);
      currentY += 58;
    }

    pdf.text('LECCIONES APRENDIDAS POR PROYECTO', marginX + halfWidth / 2, currentY, { align: 'center' });
    pdf.text('LECCIONES APRENDIDAS POR FASE', marginX + halfWidth + halfWidth / 2, currentY, { align: 'center' });
    currentY += 2;
    if (this.barChart) pdf.addImage(this.barChart.toBase64Image(), 'PNG', marginX, currentY, halfWidth, chartHeight);
    if (this.pieChart) {
      pdf.addImage(this.pieChart.toBase64Image(), 'PNG', marginX + halfWidth, currentY, halfWidth, chartHeight);
      currentY += 70;
    }
    pdf.text('LECCIONES APRENDIDAS POR SUBETAPA / ESPECIALIDAD', 105, currentY, { align: 'center' });
    currentY += 2;
    if (this.lineChart) pdf.addImage(this.lineChart.toBase64Image(), 'PNG', 10, currentY, 210 - 20, 60);

    return pdf;
  }

  downloadPDF() {
    this.generatePDF().save('Dashboard-Lecciones.pdf');
  }

  sendPDF() {
    const blob = this.generatePDF().output('blob');
    const formData = new FormData();
    formData.append('pdf', blob, 'dashboard-lecciones.pdf');

    this.loaderService.show();
    this.dashboardService.sendPdf(formData).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: 'PDF enviado exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
