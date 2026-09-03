import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';
import { CostosService } from '../../../../../core/services/arquitectura-comercial/costos.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { CostoDashboardDTO, CostoEvolucionDTO } from '../../../../../core/dtos/arquitectura-comercial/costos.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { AC_COSTOS_TABS } from '../../../shared/arquitectura-comercial-tabs';

Chart.register(...registerables);

const NOMBRES_MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const COLORES_DONA = ['#0F6E56', '#0086A5', '#509603', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#64748B'];

@Component({
  selector: 'app-costos-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './costos-dashboard.html',
  styleUrl: './costos-dashboard.css',
})
export class CostosDashboard implements AfterViewInit {
  readonly tabs = AC_COSTOS_TABS;
  anioActual = new Date().getFullYear();
  mesActual = new Date().getMonth() + 1;

  dashboard: CostoDashboardDTO | null = null;
  evolucion: CostoEvolucionDTO | null = null;
  error = '';

  metaMes = new Date().getMonth() + 1;
  metaAnio = new Date().getFullYear();
  metaMonto: number | null = null;

  get totalGastoMes(): number {
    return this.dashboard?.proyectos.reduce((acc, p) => acc + p.totalMes, 0) ?? 0;
  }

  get totalProyectos(): number {
    return this.dashboard?.proyectos.length ?? 0;
  }

  get proyectoConMayorGasto(): string {
    return this.dashboard?.proyectos[0]?.proyectoNombre ?? '—';
  }

  get proyeccionProximoMes(): number | null {
    const puntoProyectado = this.evolucion?.puntos.find((p) => p.esProyeccion);
    return puntoProyectado?.gastoEjecutadoOProyectado ?? null;
  }

  get puedeConfigurarMeta(): boolean {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('allowed_features') : null;
    const features: string[] = raw ? JSON.parse(raw) : [];
    return features.includes('arquitectura-comercial.costos.configurar');
  }

  constructor(
    private service: CostosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.load();
  }

  load(): void {
    this.error = '';
    this.loaderService.show();

    const inicio = new Date(this.anioActual, this.mesActual - 1 - 11, 1);
    const anioInicioEvolucion = inicio.getFullYear();
    const mesInicioEvolucion = inicio.getMonth() + 1;

    this.service.getDashboard(this.anioActual, this.mesActual).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.service.getEvolucion(anioInicioEvolucion, mesInicioEvolucion, 12).subscribe({
          next: (evolucion) => {
            this.evolucion = evolucion;
            this.loaderService.hide();
            this.cdr.detectChanges();
            setTimeout(() => {
              this.renderDona();
              this.renderEvolucion();
            });
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error = 'No se pudo cargar el dashboard de costos.';
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private renderDona(): void {
    const canvas = document.getElementById('chart-costos-dona') as HTMLCanvasElement | null;
    if (!canvas || !this.dashboard) return;
    Chart.getChart(canvas)?.destroy();

    const items = this.dashboard.proyectos;
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: items.map((i) => i.proyectoNombre),
        datasets: [
          {
            data: items.map((i) => i.totalMes),
            backgroundColor: items.map((_, i) => COLORES_DONA[i % COLORES_DONA.length]),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: S/. ${(ctx.raw as number).toLocaleString('es-PE')}`,
            },
          },
        },
      },
    });
  }

  private renderEvolucion(): void {
    const canvas = document.getElementById('chart-costos-evolucion') as HTMLCanvasElement | null;
    if (!canvas || !this.evolucion) return;
    Chart.getChart(canvas)?.destroy();

    const puntos = this.evolucion.puntos;
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: puntos.map((p) => `${NOMBRES_MES_CORTO[p.mes - 1]}${p.esProyeccion ? ' (Proy.)' : ''}`),
        datasets: [
          {
            label: 'Gasto Ejecutado / Proyectado',
            data: puntos.map((p) => p.gastoEjecutadoOProyectado),
            borderColor: '#1f2937',
            backgroundColor: '#1f2937',
            tension: 0.3,
          },
          {
            label: 'Presupuesto Meta',
            data: puntos.map((p) => p.presupuestoMeta ?? null),
            borderColor: '#EF4444',
            backgroundColor: '#EF4444',
            borderDash: [6, 4],
            tension: 0.3,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: S/. ${(ctx.raw as number).toLocaleString('es-PE')}`,
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => Number(v).toLocaleString('es-PE') } },
        },
      },
    });
  }

  guardarMeta(): void {
    if (this.metaMonto == null || this.metaMonto < 0) {
      Swal.fire({ icon: 'warning', title: 'Ingresa un monto válido.' });
      return;
    }
    this.loaderService.show();
    this.service.upsertMeta({ anio: this.metaAnio, mes: this.metaMes, monto: this.metaMonto }).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Meta guardada.', timer: 1500, showConfirmButton: false });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
