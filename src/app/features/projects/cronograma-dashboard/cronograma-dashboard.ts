import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CronogramaDashboardService } from './services/cronograma-dashboard.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import {
  CronogramaDashboardKpisDto,
  CronogramaDashboardProyectoDto,
  CronogramaDashboardResponsableDto,
} from './dtos/cronograma-dashboard.dtos';

@Component({
  selector: 'app-cronograma-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './cronograma-dashboard.html',
  styleUrl: './cronograma-dashboard.css',
})
export class CronogramaDashboard implements OnInit {
  loading = false;
  errorMsg = '';

  kpis: CronogramaDashboardKpisDto | null = null;
  proyectos: CronogramaDashboardProyectoDto[] = [];
  responsables: CronogramaDashboardResponsableDto[] = [];

  selectedResponsableId: number | null = null;
  selectedEstado = '';
  spiPromedio = 1.0;

  anioActual = new Date().getFullYear();
  readonly fechaActual = new Date();

  constructor(
    private service: CronogramaDashboardService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  buscar(): void {
    this.loadDashboard();
  }

  limpiar(): void {
    this.selectedResponsableId = null;
    this.selectedEstado = '';
    this.loadDashboard();
  }

  irAlCronograma(): void {
    this.router.navigate(['/projects/cronograma-actividades']);
  }

  irAProyecto(projectId: number): void {
    this.router.navigate(['/projects/cronograma-actividades', projectId]);
  }

  avanceBarColor(avance: number, estado: string): string {
    if (estado === 'SIN_ACTIVIDADES') return '#E2E8F0';
    if (avance >= 75) return '#1B6B3A';
    if (avance >= 50) return '#2E6DB4';
    if (avance >= 25) return '#D97706';
    return '#C0392B';
  }

  spiColor(spi: number, estado: string): string {
    if (estado === 'SIN_ACTIVIDADES') return '#94A3B8';
    if (spi >= 1) return '#1B6B3A';
    if (spi >= 0.9) return '#D97706';
    return '#C0392B';
  }

  spiLabel(spi: number, estado: string): string {
    if (estado === 'SIN_ACTIVIDADES') return '—';
    return spi.toFixed(2);
  }

  private loadDashboard(): void {
    this.loading = true;
    this.errorMsg = '';
    this.loaderService.show();
    const filters: { responsableId?: number; estado?: string } = {};
    if (this.selectedResponsableId != null) filters.responsableId = this.selectedResponsableId;
    if (this.selectedEstado) filters.estado = this.selectedEstado;

    this.service.getDashboard(filters).subscribe({
      next: (res) => {
        this.kpis = res.kpis;
        this.proyectos = res.proyectos;
        const conActs = res.proyectos.filter(p => p.estado !== 'SIN_ACTIVIDADES');
        this.spiPromedio = conActs.length > 0
          ? Math.round((conActs.reduce((sum, p) => sum + p.spi, 0) / conActs.length) * 100) / 100
          : 1.0;
        this.responsables = res.responsables;
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMsg = 'No se pudo cargar el dashboard. Intente nuevamente.';
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
