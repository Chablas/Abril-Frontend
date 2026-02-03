import { Component, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DashboardDTO } from '../../../../models/dashboard/DashboardDTO';
import { LessonService } from "../../../../services/lesson.service";

Chart.register(...registerables);

@Component({
  selector: 'app-lessons-dashboard',
  imports: [],
  templateUrl: './lessons-dashboard.html',
  styleUrl: './lessons-dashboard.css',
  standalone: true,
})
export class LessonsDashboard implements AfterViewInit {
  barChart?: Chart;
  pieChart?: Chart;
  
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
    const sortedData = [...data.lessonsByProject]
    .sort((a, b) => b.value - a.value);

    const labels = sortedData.map(x => x.label);
    const values = sortedData.map(x => x.value);

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

    const labels = sortedData.map(x => x.label);
    const values = sortedData.map(x => x.value);

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
      }
    });
  }
}
