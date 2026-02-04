import { Component, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from "@angular/common";
import { Chart, registerables } from 'chart.js';
import { DashboardDTO } from '../../../../models/dashboard/DashboardDTO';
import { LessonService } from "../../../../services/lesson.service";
import { PhaseStageChartDTO } from "../../../../models/dashboard/DashboardDTO";

Chart.register(...registerables);

@Component({
  selector: 'app-lessons-dashboard',
  imports: [CommonModule],
  templateUrl: './lessons-dashboard.html',
  styleUrl: './lessons-dashboard.css',
  standalone: true,
})
export class LessonsDashboard implements AfterViewInit {
  barChart?: Chart;
  pieChart?: Chart;
  phaseStageCharts: PhaseStageChartDTO[] = [];

  @ViewChild('lessonsChart') lessonsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsPieChart') lessonsPieChartRef!: ElementRef<HTMLCanvasElement>;
  ngAfterViewInit() {
    this.loadDashboard();
  }

  constructor(
    private dashboardService: LessonService,
    private cdr: ChangeDetectorRef,
  ) {}

  loadDashboard() {
    this.dashboardService.getDashboardData().subscribe({
      next: (resp: DashboardDTO) => {
        this.createBarChart(resp);
        this.createPieChart(resp);

        this.phaseStageCharts = resp.lessonsByPhaseAndStage;
        this.cdr.detectChanges();

        // Esperar a que Angular pinte los canvas
        setTimeout(() => {
          this.createPhaseStageCharts(this.phaseStageCharts);
        });
      },
      error: (err) => {
        console.error('Error cargando dashboard', err);
      },
    });
  }

  createBarChart(data: DashboardDTO) {
    // destruir gráfico anterior si existe
    if (this.barChart) {
      this.barChart.destroy();
    }

    // Mapear DTO → Chart.js
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
        responsive: false,
        indexAxis: 'y', // barras horizontales
        maintainAspectRatio: false,
      },
    });

    this.cdr.detectChanges();
  }

  createPieChart(data: DashboardDTO) {
    if (this.pieChart) {
      this.pieChart.destroy();
    }
    const colorPalette = [
      '#64BC04',
      '#A7E163',
      '#E5F7D1',
      '#2F855A',
      '#68D391',
      '#9AE6B4',
      '#38A169',
      '#C6F6D5',
    ];
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
            backgroundColor: colorPalette,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: false,
      },
    });
  }

  createPhaseStageCharts(data: PhaseStageChartDTO[]) {
    data.forEach((phase) => {
      const canvasId = `phaseChart-${phase.phaseId}`;
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

      if (!canvas) return;

      const labels = phase.stages.map((s) => s.label);
      const values = phase.stages.map((s) => s.value);

      const colors = ['#2F855A', '#38A169', '#68D391', '#9AE6B4', '#C6F6D5', '#E5F7D1'];

      new Chart(canvas, {
        type: 'pie',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors.slice(0, values.length),
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
          },
        },
      });
    });
  }
}
