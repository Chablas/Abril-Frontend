import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { AlmacenService } from '../../../../core/services/almacen/almacen.service';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { AlmacenDashboardDTO, ProyectoAlmacenFiltroDTO } from '../../../../core/dtos/almacen/almacen.model';
import { ALMACEN_TABS } from '../../shared/almacen-tabs';

Chart.register(...registerables);

const COLORES_DONA = ['#0F6E56', '#0086A5', '#509603', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

@Component({
  selector: 'app-almacen-dashboard',
  standalone: true,
  imports: [CommonModule, SearchSelect, AbrilPageHeaderComponent],
  templateUrl: './almacen-dashboard.html',
  styleUrl: './almacen-dashboard.css',
})
export class AlmacenDashboard implements AfterViewInit {
  readonly tabs = ALMACEN_TABS;

  proyectos: ProyectoAlmacenFiltroDTO[] = [];
  proyectoId: number | null = null;

  data: AlmacenDashboardDTO | null = null;
  error = '';

  constructor(
    private service: AlmacenService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.loadFiltros();
    this.load();
  }

  loadFiltros(): void {
    this.service.getFiltros().subscribe({
      next: (data) => {
        this.proyectos = [...data.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.load();
  }

  load(): void {
    this.error = '';
    this.loaderService.show();
    this.service.getDashboard(this.proyectoId).subscribe({
      next: (data) => {
        this.data = data;
        this.loaderService.hide();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.renderFlujo();
          this.renderParticipacion();
          this.renderCobertura();
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error = 'No se pudo cargar el dashboard de almacén.';
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get totalMaterialesSeguimiento(): number {
    return this.data?.materialesCriticos.length ?? 0;
  }

  get totalCriticos(): number {
    return this.data?.materialesCriticos.filter((m) => m.estado === 'Crítico').length ?? 0;
  }

  get proyectoQueMasConsume(): string {
    return this.data?.participacionProyectos[0]?.proyectoNombre ?? '—';
  }

  get totalConsumoGlobal(): number {
    return this.data?.participacionProyectos.reduce((acc, p) => acc + p.totalConsumo, 0) ?? 0;
  }

  estadoClase(estado: string): string {
    switch (estado) {
      case 'Crítico': return 'badge-estado badge-estado--critico';
      case 'Alerta Baja': return 'badge-estado badge-estado--alerta';
      case 'Bajo Mínimos': return 'badge-estado badge-estado--bajo';
      default: return 'badge-estado badge-estado--optimo';
    }
  }

  trackByMaterial(_: number, m: { materialId: number }): number {
    return m.materialId;
  }

  private renderFlujo(): void {
    const canvas = document.getElementById('chart-almacen-flujo') as HTMLCanvasElement | null;
    if (!canvas || !this.data) return;
    Chart.getChart(canvas)?.destroy();

    const items = this.data.flujoMateriales;
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((i) => i.materialNombre),
        datasets: [
          { label: 'Ingresos (Almacén)', data: items.map((i) => i.totalIngresos), backgroundColor: '#0086A5' },
          { label: 'Salidas (Proyectos)', data: items.map((i) => i.totalSalidas), backgroundColor: '#1f2937' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  private renderParticipacion(): void {
    const canvas = document.getElementById('chart-almacen-participacion') as HTMLCanvasElement | null;
    if (!canvas || !this.data) return;
    Chart.getChart(canvas)?.destroy();

    const items = this.data.participacionProyectos;
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: items.map((i) => `${i.proyectoNombre} (${i.porcentaje}%)`),
        datasets: [
          {
            data: items.map((i) => i.totalConsumo),
            backgroundColor: items.map((_, i) => COLORES_DONA[i % COLORES_DONA.length]),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } } },
      },
    });
  }

  private renderCobertura(): void {
    const canvas = document.getElementById('chart-almacen-cobertura') as HTMLCanvasElement | null;
    if (!canvas || !this.data) return;
    Chart.getChart(canvas)?.destroy();

    const items = this.data.cobertura;
    const limite = this.data.limiteSeguridadDias;

    const lineaLimitePlugin = {
      id: 'lineaLimite',
      afterDraw: (c: Chart) => {
        const yScale = c.scales['y'];
        if (!yScale) return;
        const ctx = c.ctx;
        const y = yScale.getPixelForValue(limite);
        ctx.save();
        ctx.strokeStyle = '#EF4444';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(c.chartArea.left, y);
        ctx.lineTo(c.chartArea.right, y);
        ctx.stroke();
        ctx.restore();
      },
    };

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((i) => i.materialNombre),
        datasets: [
          {
            label: 'Días de cobertura',
            data: items.map((i) => i.diasCobertura ?? 0),
            backgroundColor: items.map((i) => ((i.diasCobertura ?? 0) < limite ? '#EF4444' : '#509603')),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} días` } },
        },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
      plugins: [lineaLimitePlugin],
    });
  }
}
