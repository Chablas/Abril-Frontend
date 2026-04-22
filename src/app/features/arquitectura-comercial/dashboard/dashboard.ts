import { Component, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ArquitecturaComercialService } from '../../../core/services/arquitectura-comercial.service';
import { ErrorService } from '../../../core/services/error.service';
import { LoaderService } from '../../../core/services/loader.service';
import {
  ArqComercialDashboardDTO,
  ArqComercialFiltersDTO,
  ArqComercialSelectedFilters,
  ArqComercialKpiDTO,
  ArqComercialAlertDTO,
  ProyeccionAvanceDTO,
  ChartItemDTO,
  EficienciaSemanalDTO,
  SupervisorProgresoDTO,
  HitoCriticoDTO,
} from '../../../core/dtos/arquitectura-comercial/arquitectura-comercial-dashboard.model';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-arq-comercial-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements AfterViewInit, OnDestroy {
  loader = true;

  kpis: ArqComercialKpiDTO = {
    totalActividades: 0, culminadas: 0, enProceso: 0,
    vencidas: 0, pendientes: 0, eficienciaMedia: 0, progresoGlobal: 0,
  };

  alertas: ArqComercialAlertDTO = {
    vencidasSinCerrar: 0, vencenEstaSemana: 0,
    arrancanEstaSemana: 0, hitosProximos14Dias: 0,
  };

  supervisores: SupervisorProgresoDTO[] = [];
  hitosCriticos: HitoCriticoDTO[] = [];

  filters: ArqComercialFiltersDTO = { semanas: [], meses: [], proyectos: [] };
  selectedFilters: ArqComercialSelectedFilters = {
    semana: null, mes: null, proyectoId: 0,
  };

  private proyeccionChart?: Chart;
  private rankingChart?: Chart;
  private distribucionChart?: Chart;
  private tendenciaChart?: Chart;

  @ViewChild('proyeccionCanvas') proyeccionRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rankingCanvas') rankingRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distribucionCanvas') distribucionRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tendenciaCanvas') tendenciaRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private service: ArquitecturaComercialService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit() {
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.proyeccionChart?.destroy();
    this.rankingChart?.destroy();
    this.distribucionChart?.destroy();
    this.tendenciaChart?.destroy();
  }

  loadInitialData() {
    this.loader = true;
    forkJoin({
      dashboard: this.service.getDashboardData(this.selectedFilters),
      filters: this.service.getFilters(),
    }).subscribe({
      next: ({ dashboard, filters }) => {
        this.filters = filters;
        this.applyDashboardData(dashboard);
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  search() {
    this.loader = true;
    this.cdr.detectChanges();
    this.service.getDashboardData(this.selectedFilters).subscribe({
      next: (dashboard) => {
        this.applyDashboardData(dashboard);
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  private applyDashboardData(d: ArqComercialDashboardDTO) {
    this.kpis = d.kpis;
    this.alertas = d.alertas;
    this.supervisores = d.supervisores;
    this.hitosCriticos = d.hitosCriticos;
    this.cdr.detectChanges();

    this.createProyeccionChart(d.proyeccionAvance);
    this.createRankingChart(d.rankingEficiencia);
    this.createDistribucionChart(d.distribucionEstado);
    this.createTendenciaChart(d.tendenciaEficiencia);
  }

  // --- Charts ---

  private createProyeccionChart(data: ProyeccionAvanceDTO) {
    this.proyeccionChart?.destroy();
    this.proyeccionChart = new Chart(this.proyeccionRef.nativeElement, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Programado',
            data: data.programado,
            backgroundColor: '#93c5fd',
            borderColor: '#2563eb',
            borderWidth: 1,
          },
          {
            label: 'Real',
            data: data.real,
            backgroundColor: '#86efac',
            borderColor: '#16a34a',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          datalabels: { display: false },
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }

  private createRankingChart(data: ChartItemDTO[]) {
    this.rankingChart?.destroy();
    const sorted = [...data].sort((a, b) => b.value - a.value);
    this.rankingChart = new Chart(this.rankingRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map(i => i.label),
        datasets: [{
          label: 'Eficiencia %',
          data: sorted.map(i => i.value),
          backgroundColor: sorted.map(i =>
            i.value >= 80 ? '#16a34a' : i.value >= 50 ? '#ea580c' : '#dc2626'
          ),
          borderWidth: 0,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'right',
            color: '#6b7280',
            font: { weight: 'bold', size: 11 },
            formatter: (v) => `${v}%`,
          },
        },
        scales: {
          x: { display: false, max: 110 },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  private createDistribucionChart(data: ChartItemDTO[]) {
    this.distribucionChart?.destroy();
    const colorMap: Record<string, string> = {
      'Culminado': '#16a34a', 'Culminada': '#16a34a', 'Culminadas': '#16a34a',
      'En proceso': '#2563eb', 'En Proceso': '#2563eb',
      'Vencido': '#dc2626', 'Vencida': '#dc2626', 'Vencidas': '#dc2626',
      'Pendiente': '#ea580c', 'Pendientes': '#ea580c',
    };
    this.distribucionChart = new Chart(this.distribucionRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: data.map(i => i.label),
        datasets: [{
          data: data.map(i => i.value),
          backgroundColor: data.map(i => colorMap[i.label] ?? '#9ca3af'),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold', size: 12 },
            formatter: (v) => v > 0 ? v : '',
          },
        },
      },
    });
  }

  private createTendenciaChart(data: EficienciaSemanalDTO[]) {
    this.tendenciaChart?.destroy();
    this.tendenciaChart = new Chart(this.tendenciaRef.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(i => i.semana),
        datasets: [{
          label: 'Eficiencia %',
          data: data.map(i => i.valor),
          backgroundColor: data.map(i =>
            i.valor >= 80 ? '#86efac' : i.valor >= 50 ? '#fde68a' : '#fca5a5'
          ),
          borderColor: data.map(i =>
            i.valor >= 80 ? '#16a34a' : i.valor >= 50 ? '#ea580c' : '#dc2626'
          ),
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'top',
            color: '#6b7280',
            font: { weight: 'bold', size: 11 },
            formatter: (v) => `${v}%`,
          },
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  // --- Helpers ---

  getEstadoColor(estado: string): string {
    const map: Record<string, string> = {
      'Culminado': '#16a34a', 'Culminada': '#16a34a',
      'En proceso': '#2563eb', 'En Proceso': '#2563eb',
      'Vencido': '#dc2626', 'Vencida': '#dc2626',
      'Pendiente': '#ea580c',
    };
    return map[estado] ?? '#9ca3af';
  }

  getHitoUrgencia(dias: number): string {
    if (dias < 0) return 'text-red-600 font-bold';
    if (dias <= 3) return 'text-orange-600 font-semibold';
    if (dias <= 7) return 'text-yellow-600';
    return 'text-gray-600';
  }
}
