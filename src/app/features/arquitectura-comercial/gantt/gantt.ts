import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { ArquitecturaComercialService } from '../../../core/services/arquitectura-comercial.service';
import {
  GanttActividadDTO,
  ProyectoConActividadesDTO,
} from '../../../core/dtos/arquitectura-comercial/actividades.model';

type TipoFiltro = '' | 'HITO' | 'ENTREGABLE';

const QUICKCHART_GET_LIMIT = 16000;
const QUICKCHART_BASE = 'https://quickchart.io/chart';
const QUICKCHART_CREATE = 'https://quickchart.io/chart/create';

@Component({
  selector: 'app-arq-comercial-gantt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gantt.html',
  styleUrl: './gantt.css',
})
export class Gantt implements OnInit {
  readonly etapasFijas = ['PREVENTA', 'OBRA', 'EDIFICIO ENTREGADO', 'POST VENTA Y EXPERIENCIA'];

  proyectos: ProyectoConActividadesDTO[] = [];
  selectedProyectoId: number | null = null;
  get selectedProyecto(): ProyectoConActividadesDTO | null {
    return this.proyectos.find(p => p.id === this.selectedProyectoId) ?? null;
  }
  get proyectosConActividades(): ProyectoConActividadesDTO[] {
    return this.proyectos.filter(p => !p.sinActividades);
  }
  get proyectosSinActividades(): ProyectoConActividadesDTO[] {
    return this.proyectos.filter(p => p.sinActividades);
  }

  actividades: GanttActividadDTO[] = [];
  tipoFiltro: TipoFiltro = '';
  etapaNombreFiltro: string | null = null;
  soloActivas = false;

  loading = false;
  chartUrl: string | null = null;
  chartError: string | null = null;

  constructor(
    private service: ArquitecturaComercialService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProyectos();
  }

  loadProyectos(): void {
    this.service.getProyectosConActividades().subscribe({
      next: data => {
        this.proyectos = [...data].sort((a, b) => {
          const aHas = a.totalActividades > 0 ? 0 : 1;
          const bHas = b.totalActividades > 0 ? 0 : 1;
          if (aHas !== bHas) return aHas - bHas;
          return a.nombre.localeCompare(b.nombre);
        });
        this.cdr.detectChanges();
      },
      error: () => this.showError('No se pudieron cargar los proyectos'),
    });
  }

  selectProyecto(p: ProyectoConActividadesDTO): void {
    if (this.selectedProyectoId === p.id) return;
    this.selectedProyectoId = p.id;
    this.resetFilters();
    this.loadGantt();
  }

  resetFilters(): void {
    this.tipoFiltro = '';
    this.etapaNombreFiltro = null;
    this.soloActivas = false;
  }

  setTipo(t: TipoFiltro): void {
    this.tipoFiltro = t;
    this.loadGantt();
  }

  onFiltroChange(): void {
    this.loadGantt();
  }

  loadGantt(): void {
    if (!this.selectedProyectoId) return;
    this.loading = true;
    this.chartUrl = null;
    this.chartError = null;

    this.service
      .getGantt({
        proyectoId: this.selectedProyectoId,
        tipo: this.tipoFiltro || null,
        etapa: this.etapaNombreFiltro,
        soloActivas: this.soloActivas || null,
      })
      .subscribe({
        next: data => {
          this.actividades = data;
          this.loading = false;
          if (data.length === 0) {
            this.cdr.detectChanges();
            return;
          }
          this.buildChart(data);
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.showError('No se pudieron cargar las actividades');
        },
      });
  }

  private buildChart(data: GanttActividadDTO[]): void {
    const labels = data.map(a => this.truncate(a.nombre, 50));

    const planificado = data.map(a => [
      a.inicioProgramado,
      a.finProgramado ?? a.inicioProgramado,
    ]);

    const real = data.map(a =>
      a.inicioEfectivo ? [a.inicioEfectivo, a.finEfectivo ?? a.inicioEfectivo] : null,
    );

    const config = {
      type: 'horizontalBar',
      data: {
        labels,
        datasets: [
          {
            label: 'Planificado',
            backgroundColor: '#3B82F6',
            data: planificado,
          },
          {
            label: 'Real',
            backgroundColor: '#10B981',
            data: real,
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: this.selectedProyecto?.nombre ?? '',
        },
        scales: {
          xAxes: [
            {
              type: 'time',
              time: { unit: 'week' },
            },
          ],
        },
      },
    };

    const height = Math.max(300, 40 + data.length * 28);
    const width = 1100;
    const json = JSON.stringify(config);
    const encoded = encodeURIComponent(json);
    const getUrl = `${QUICKCHART_BASE}?c=${encoded}&width=${width}&height=${height}&backgroundColor=white`;

    if (getUrl.length <= QUICKCHART_GET_LIMIT) {
      this.chartUrl = getUrl;
      this.cdr.detectChanges();
      return;
    }

    this.http
      .post<{ success: boolean; url: string }>(QUICKCHART_CREATE, {
        chart: config,
        width,
        height,
        backgroundColor: 'white',
      })
      .subscribe({
        next: res => {
          this.chartUrl = res?.url ?? null;
          if (!this.chartUrl) this.chartError = 'No se pudo generar el Gantt.';
          this.cdr.detectChanges();
        },
        error: () => {
          this.chartError = 'No se pudo generar el Gantt (QuickChart).';
          this.cdr.detectChanges();
        },
      });
  }

  private truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  trackByProyecto(_: number, p: ProyectoConActividadesDTO): number {
    return p.id;
  }

  proyectoRowClass(p: ProyectoConActividadesDTO): string {
    const base: string[] = [];
    if (this.selectedProyectoId === p.id) {
      base.push('bg-[#DCFCE7] border-l-[3px] border-[#16A34A] text-[#15803D]');
    } else {
      base.push('border-l-[3px] border-transparent hover:bg-gray-100');
    }
    if (p.estado !== 'ACTIVO') base.push('opacity-60');
    return base.join(' ');
  }

  private showError(msg: string): void {
    Swal.fire({ icon: 'error', title: 'Error', text: msg });
  }
}
