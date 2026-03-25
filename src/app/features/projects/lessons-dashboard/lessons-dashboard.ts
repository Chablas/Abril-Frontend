import { Component, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { DashboardDTO } from '../../../core/dtos/dashboard/DashboardDTO';
import { LessonService } from '../../../core/services/lesson.service';
import { PhaseStageChartDTO } from '../../../core/dtos/dashboard/DashboardDTO';
import { HttpErrorResponse } from '@angular/common/http';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Filters } from "../../../core/models/filters.model";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { forkJoin } from 'rxjs';
import { LessonFiltersDTO } from "../../../core/dtos/lesson/lessonFilters.model";
import { SelectedFilters } from "../../../core/models/selectedFilters.model";
import { SelectedDashboardOptions } from "../../../core/models/lesson-dashboard/selectedOptions.model";
import { FormsModule } from '@angular/forms';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-lessons-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './lessons-dashboard.html',
  styleUrl: './lessons-dashboard.css',
  standalone: true,
})
export class LessonsDashboard implements AfterViewInit {
  barChart?: Chart;
  pieChart?: Chart;
  lineChart?: Chart;
  phaseStageCharts: PhaseStageChartDTO[] = [];
  colors = [
    //'#f0f8e6',
    //'#e0f2cd',
    '#d1ebb4',
    '#c1e49b',
    '#b2de82',
    '#a2d768',
    '#93d04f',
    '#83c936',
    '#74c31d',
    '#5aa904',
    '#509603',
    '#468403',
    '#3c7102',
    '#325e02',
    '#284b02',
    '#1e3801',
    '#142601',
    '#0a1300',
  ];

  loader = true;
  filters: LessonFiltersDTO = {
    projects: [],
    areas: [],
    periods: [],
    phases: [],
    stages: [],
    layers: [],
    subStages: [],
    subSpecialties: [],
    users: [],
  };
  selectedFilters: SelectedDashboardOptions = {
    projectId: 0,
    areaId: 0,
    periodDate: null,
    phaseId: 0,
    stageId: 0,
    layerId: 0,
    subStageId: 0,
    subSpecialtyId: 0,
    userId: 0,
  };

  @ViewChild('lessonsChart') lessonsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsPieChart') lessonsPieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsLineChart') lessonsLineChartRef!: ElementRef<HTMLCanvasElement>;
  ngAfterViewInit() {
    this.loadInitialData();
  }

  constructor(
    private dashboardService: LessonService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  loadInitialData() {
    this.loader = true;

    forkJoin({
      dashboard: this.dashboardService.getDashboardData([6, 7, 24, 25, 27, 28, 29, 30, 47], this.selectedFilters),
      filters: this.dashboardService.getFilters(),
    }).subscribe({
      next: ({ dashboard, filters }) => {
        this.createBarChart(dashboard);
        this.createPieChart(dashboard);
        this.createLineChart(dashboard);
        this.phaseStageCharts = dashboard.lessonsByPhaseAndStage;

        setTimeout(() => {
          this.createPhaseStageCharts(this.phaseStageCharts);
        });

        this.filters = filters;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  loadDashboard() {
    this.loader = true;
    this.dashboardService.getDashboardData([6, 7, 24, 25, 27, 28, 29, 30, 47], this.selectedFilters).subscribe({
      next: (resp: DashboardDTO) => {
        this.createBarChart(resp);
        this.createPieChart(resp);
        this.createLineChart(resp);

        this.phaseStageCharts = resp.lessonsByPhaseAndStage;

        setTimeout(() => {
          this.createPhaseStageCharts(this.phaseStageCharts);
        });
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  createBarChart(data: DashboardDTO) {
    if (this.barChart) {
      this.barChart.destroy();
    }

    const sortedData = [...data.lessonsByProject].sort((a, b) => b.value - a.value);

    const labels = sortedData.map((x) => x.label);
    const values = sortedData.map((x) => x.value);

    this.barChart = new Chart(this.lessonsChartRef.nativeElement, {
      type: 'bar',

      data: {
        labels: labels,

        datasets: [
          {
            label: 'Lecciones aprendidas',
            data: values,
            backgroundColor: '#E5F7D1',
            borderColor: '#64BC04',
            borderWidth: 2,
          },
        ],
      },

      options: {
        responsive: true,
        indexAxis: 'y', // barras horizontales
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            display: true,
            color: '#828282',
            formatter: (value) => value,
            font: {
              weight: 'bold',
              size: 12,
            },
            anchor: 'end',
            align: 'right',
            offset: 4,
          },
          legend: {
            position: 'bottom',
          },
        },
        scales: {
          x: {
            ticks: {
              precision: 0,
            },
            beginAtZero: true,
          },
        },
      },
    });

    this.cdr.detectChanges();
  }

  createPieChart(data: DashboardDTO) {
    if (this.pieChart) {
      this.pieChart.destroy();
    }
    /*const colorPalette = [
      '#64BC04',
      '#A7E163',
      '#E5F7D1',
      '#2F855A',
      '#68D391',
      '#9AE6B4',
      '#38A169',
      '#C6F6D5',
    ];*/
    const sortedData = [...data.lessonsByPhase].sort((a, b) => b.value - a.value);

    const labels = sortedData.map((x) => x.label);
    const values = sortedData.map((x) => x.value);

    this.pieChart = new Chart(this.lessonsPieChartRef.nativeElement, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: this.colors,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          datalabels: {
            color: '#828282',
            formatter: (value) => value,
            font: {
              weight: 'bold',
              size: 12,
            },
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }

  createPhaseStageCharts(data: PhaseStageChartDTO[]) {
    //const colors = ['#2F855A', '#38A169', '#68D391', '#9AE6B4', '#C6F6D5', '#E5F7D1']; // verdes
    const colors = [
      '#D4F0C2', // verde claro
      '#BEE7E8', // celeste pastel
      '#C7CEEA', // lavanda
      '#F9D8A6', // durazno
      '#FFF1A8', // amarillo suave
      '#F6C1CC', // rosa pastel
    ];

    data.forEach((phase) => {
      const canvasId = `phaseChart-${phase.phaseId}`;
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

      if (!canvas) return;

      const hasData = phase.stages.length > 0;

      const labels = hasData ? phase.stages.map((s) => s.label) : ['Sin datos'];

      const values = hasData ? phase.stages.map((s) => s.value) : [1]; // valor dummy

      const backgroundColors = hasData ? this.colors.slice(0, values.length) : ['rgba(0,0,0,0)'];

      const borderColors = hasData ? this.colors.slice(0, values.length) : ['#CBD5E0'];

      const emptyTextPlugin = {
        id: 'emptyText',
        afterDraw(chart: any) {
          if (hasData) return;

          const { ctx, width, height } = chart;
          ctx.save();
          ctx.font = 'bold 14px sans-serif';
          ctx.fillStyle = '#718096';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Sin datos', width / 2, height / 2);
          ctx.restore();
        },
      };

      const existingChart = Chart.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: backgroundColors,
              borderColor: borderColors,
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
              position: 'bottom',
              maxWidth: 50,
            },
            datalabels: {
              display: hasData,
              color: '#828282',
              formatter: (value: number, ctx: any) => {
                const label = ctx.chart.data.labels?.[ctx.dataIndex];
                return `${label}: ${value}`;
              },
              font: {
                size: 11,
                weight: 'bold',
              },
            },
          },
        },
        plugins: hasData ? [] : [emptyTextPlugin],
      });
    });
  }

  createLineChart(data: DashboardDTO) {
    // destruir gráfico anterior si existe
    if (this.lineChart) {
      this.lineChart.destroy();
    }

    // Mapear DTO → Chart.js
    const sortedData = [...data.lessonsBySubStage].sort((a, b) => b.value - a.value);

    const labels = sortedData.map((x) => x.label);
    const values = sortedData.map((x) => x.value);

    this.lineChart = new Chart(this.lessonsLineChartRef.nativeElement, {
      type: 'line',

      data: {
        labels: labels,

        datasets: [
          {
            label: 'Lecciones aprendidas',
            data: values,
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
          legend: {
            position: 'bottom',
          },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            offset: 3,
          },
        },
        scales: {
          y: {
            ticks: {
              precision: 0,
            },
            beginAtZero: true,
          },
        },
      },
    });
    this.cdr.detectChanges();
  }

  generatePDF() {
    this.loader = true;
    this.cdr.detectChanges();
    const pdf = new jsPDF('p', 'mm', 'a4');

    const marginX = 10;
    const pageWidth = 210;
    const usableWidth = pageWidth - marginX * 2;
    const halfWidth = usableWidth / 2;
    const chartHeight = 60;
    const startY = 10;
    let currentY = 10;

    // 🔹 Título
    autoTable(pdf, {
      startY,
      theme: 'grid',
      styles: { halign: 'center', valign: 'middle', fontSize: 10 },
      tableWidth: 190,
      body: [
        [
          {
            content: '', // logo
            rowSpan: 5,
            colSpan: 2,
            styles: { cellWidth: 50 },
          },
          {
            content: 'DASHBOARD DE LECCIONES APRENDIDAS\nUNIDAD DE PROYECTOS',
            rowSpan: 5,
            colSpan: 4,
            styles: { fontSize: 14, fontStyle: 'bold', cellWidth: 80 },
          },
          { content: 'UDP-FO-19', colSpan: 3 },
        ],
        [{ content: 'Versión: 01', colSpan: 3 }],
        [{ content: 'Fecha: ' + new Date().toLocaleDateString(), colSpan: 3 }],
        [
          { content: 'Elaborado', colSpan: 1 },
          { content: 'Revisado', colSpan: 1 },
          { content: 'Aprobado', colSpan: 1 },
        ],
        [
          { content: 'RS', colSpan: 1 },
          { content: 'GP', colSpan: 1 },
          { content: 'GP', colSpan: 1 },
        ],
      ],
      didDrawCell: (data) => {
        // Insertar logo en la celda combinada
        if (data.row.index === 0 && data.column.index === 0) {
          pdf.addImage(
            '../../images/abril-logo-removebg-preview.jpg',
            'JPG',
            data.cell.x + 2,
            data.cell.y + 5,
            46,
            26,
          );
        }
      },
    });
    currentY = (pdf as any).lastAutoTable.finalY + 5;
    currentY += 5;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    currentY += 5;
    pdf.text('LECCIONES APRENDIDAS POR PROYECTO', marginX + halfWidth / 2, currentY, {
      align: 'center',
    });

    pdf.text('LECCIONES APRENDIDAS POR FASE', marginX + halfWidth + halfWidth / 2, currentY, {
      align: 'center',
    });
    currentY += 2;
    if (this.barChart) {
      const img = this.barChart.toBase64Image();
      pdf.addImage(img, 'PNG', marginX, currentY, halfWidth, chartHeight);
    }

    if (this.pieChart) {
      const img = this.pieChart.toBase64Image();
      pdf.addImage(img, 'PNG', marginX + halfWidth, currentY, halfWidth, chartHeight);
      currentY += 70;
    }

    pdf.text('LECCIONES APRENDIDAS POR SUBETAPA', 105, currentY, {
      align: 'center',
    });
    currentY += 2;
    if (this.lineChart) {
      const img = this.lineChart.toBase64Image();
      pdf.addImage(img, 'PNG', 10, currentY, pageWidth - 20, 60);
      currentY += 70;
    }
    this.loader = false;
    this.cdr.detectChanges();
    return pdf;
  }

  downloadPDF() {
    const pdf = this.generatePDF();
    this.loader = true;
    this.cdr.detectChanges();
    pdf.save('Dashboard.pdf');
    this.loader = false;
    this.cdr.detectChanges();
  }

  sendPDF() {
    const pdf = this.generatePDF();

    const blob = pdf.output('blob');

    const formData = new FormData();
    formData.append('pdf', blob, 'reporte-lecciones.pdf');

    this.loader = true;
    this.cdr.detectChanges();

    this.dashboardService.sendPDF(formData).subscribe({
      next: () => {
        this.loader = false;
        this.cdr.detectChanges();
        Swal.fire({
          title: 'PDF enviado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }
  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    const validationError = err.error?.errors
      ? Object.values(err.error.errors as Record<string, string[]>)[0]?.[0]
      : null;
    const message = validationError || err.error?.message || 'Ocurrió un error.';

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: message,
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: message,
      });
      return;
    }
  }
}
