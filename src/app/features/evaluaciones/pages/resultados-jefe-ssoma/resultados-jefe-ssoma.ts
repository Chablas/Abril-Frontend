import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent, AbrilPageTabGroup } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvJefeSsomaService } from '../../services/ev-jefe-ssoma.service';
import { EvAccesoService } from '../../services/ev-acceso.service';
import { buildEvaluacionesTabGroups } from '../../shared/evaluaciones-tabs';
import {
  EvJefeSsomaResultadosDto,
  EvJefeSsomaCumplimientoDto,
  EvJefeSsomaCriterioPromedioDto,
  EvJefeSsomaPlanAccionDto,
  EvJefeSsomaTendenciaDto,
} from '../../dtos/ev-jefe-ssoma.model';
import { EvAccesoDto } from '../../dtos/ev-acceso.model';

interface Recomendacion {
  criterio: string;
  promedio: number;
  tip: string;
}

const ESTADOS = ['Pendiente', 'En progreso', 'Completado'];

@Component({
  selector: 'app-resultados-jefe-ssoma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './resultados-jefe-ssoma.html',
  styleUrl: './resultados-jefe-ssoma.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadosJefeSsoma implements OnInit, AfterViewInit {
  resultados: EvJefeSsomaResultadosDto | null = null;
  cumplimiento: EvJefeSsomaCumplimientoDto | null = null;
  planAccion: EvJefeSsomaPlanAccionDto[] = [];
  loading = true;
  tabGroups: AbrilPageTabGroup[] = buildEvaluacionesTabGroups(null);
  acceso: EvAccesoDto | null = null;
  readonly estados = ESTADOS;

  // ─── Formulario de plan de acción ──────────────────────────────────────────
  mostrarFormPlan = false;
  guardandoPlan = false;
  planCriterio = '';
  planAccionTexto = '';
  planMeta = '';
  planFechaLimite = '';

  private chartTendencia: Chart | null = null;

  notaClase(nota: number | null): string {
    if (nota === null) return 'nota-sin';
    if (nota > 15) return 'nota-aprobado';
    if (nota >= 12) return 'nota-regular';
    return 'nota-desaprobado';
  }

  notaDisplay(nota: number | null): string {
    return nota !== null ? nota.toFixed(1) : '—';
  }

  get porcentajeCompletado(): number {
    if (!this.cumplimiento || !this.cumplimiento.totalEvaluadores) return 0;
    return Math.round((this.cumplimiento.totalCompletaron / this.cumplimiento.totalEvaluadores) * 100);
  }

  /** Delta del promedio general vs. el mes anterior de la serie de tendencia. */
  get tendenciaDelta(): number | null {
    const t = this.resultados?.tendencia ?? [];
    if (t.length < 2) return null;
    const actual = t[t.length - 1].promedio;
    const anterior = t[t.length - 2].promedio;
    if (actual === null || anterior === null) return null;
    return Math.round((actual - anterior) * 10) / 10;
  }

  /** Los 3 criterios peor calificados, con un tip genérico accionable. */
  get recomendaciones(): Recomendacion[] {
    const criterios = this.resultados?.promediosPorCriterio ?? [];
    return [...criterios]
      .sort((a, b) => a.promedio - b.promedio)
      .slice(0, 3)
      .filter((c) => c.promedio < 4.5)
      .map((c) => ({
        criterio: c.criterio,
        promedio: c.promedio,
        tip: this.tipPara(c),
      }));
  }

  private tipPara(c: EvJefeSsomaCriterioPromedioDto): string {
    if (c.promedio < 3) {
      return 'Prioridad alta: define una acción concreta con fecha límite en tu plan de acción.';
    }
    if (c.promedio < 4) {
      return 'Punto de mejora: conviene un compromiso medible para el próximo período.';
    }
    return 'Bien calificado, pero es el más bajo de tus criterios — vale la pena reforzarlo.';
  }

  get puedeGestionarPlan(): boolean {
    return !!this.acceso?.esJefeSsoma;
  }

  constructor(
    private svc: EvJefeSsomaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
    private accesoSvc: EvAccesoService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.accesoSvc.getAcceso().subscribe((acceso) => {
      this.acceso = acceso;
      this.tabGroups = buildEvaluacionesTabGroups(acceso);
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    if (this.resultados) this.renderCharts();
  }

  cargar(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getResultados().subscribe({
      next: (resultados) => {
        this.resultados = resultados;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
        this.renderCharts();

        // Cumplimiento y plan de acción se piden del MISMO período que se está
        // mostrando en resultados (no del período activo) — antes se pedían por
        // separado y podían no coincidir (p. ej. fuera de la ventana de evaluación,
        // "Cumplimiento" quedaba en 0 de 0 mientras Resultados mostraba el mes
        // anterior cerrado, lo cual no tenía sentido para quien lo veía).
        const periodoId = resultados.periodo?.id;
        if (periodoId) {
          this.svc.getPendientes(periodoId).subscribe({
            next: (c) => { this.cumplimiento = c; this.cdr.markForCheck(); },
          });
          this.svc.getPlanAccion(periodoId).subscribe({
            next: (p) => { this.planAccion = p; this.cdr.markForCheck(); },
          });
        }
      },
      error: (err) => {
        this.loading = false;
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Charts ──────────────────────────────────────────────────────────────
  // Los criterios se muestran como barras HTML (ver .criterio-bars en el
  // template): un canvas de Chart.js no deja suficiente ancho para el texto
  // largo de cada criterio dentro de una columna de 3, y quedaba amontonado.
  // La tendencia sí es un caso real de línea de tiempo, pero necesita ≥2
  // puntos — con 1 solo dato Chart.js dibuja un eje sin ninguna línea visible
  // (se ve "roto"), así que ese caso ni siquiera intenta el canvas (ver
  // template: usa `tendencia-simple` en su lugar).

  private renderCharts(): void {
    // Doble rAF: al montarse junto con el resto del layout (KPIs, columnas),
    // el contenedor del canvas puede medir ancho 0 en el primer frame — sin
    // esto el gráfico queda con el eje Y ocupando casi todo el espacio y la
    // línea apretada en una esquina (bug real, no solo estético).
    requestAnimationFrame(() => requestAnimationFrame(() => this.renderTendencia()));
  }

  private renderTendencia(): void {
    const canvas = document.getElementById('chart-tendencia-jefe') as HTMLCanvasElement | null;
    const tendencia = this.resultados?.tendencia ?? [];
    if (!canvas || tendencia.length < 2) return;
    this.chartTendencia?.destroy();

    this.chartTendencia = new Chart(canvas, {
      type: 'line',
      data: {
        labels: tendencia.map((t: EvJefeSsomaTendenciaDto) => `${t.nombreMes} ${t.anio}`),
        datasets: [{
          data: tendencia.map((t) => t.promedio),
          borderColor: '#2E6DB4',
          backgroundColor: 'rgba(46,109,180,0.12)',
          pointBackgroundColor: '#2E6DB4',
          tension: 0.3,
          fill: true,
          spanGaps: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${(ctx.raw as number)?.toFixed(1) ?? '—'} / 20` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { min: 0, max: 20, grid: { color: '#F1F5F9' }, ticks: { stepSize: 5, font: { size: 10 } } },
        },
      },
    });
    this.chartTendencia.resize();
  }

  // ─── Plan de acción ──────────────────────────────────────────────────────

  abrirFormPlan(criterio?: string): void {
    this.planCriterio = criterio ?? (this.resultados?.promediosPorCriterio[0]?.criterio ?? '');
    this.planAccionTexto = '';
    this.planMeta = '';
    this.planFechaLimite = '';
    this.mostrarFormPlan = true;
    this.cdr.markForCheck();
  }

  cerrarFormPlan(): void {
    this.mostrarFormPlan = false;
    this.cdr.markForCheck();
  }

  get puedeGuardarPlan(): boolean {
    return !!this.planCriterio && this.planAccionTexto.trim().length > 0 && this.planMeta.trim().length > 0;
  }

  guardarPlan(): void {
    const periodoId = this.resultados?.periodo?.id;
    if (!periodoId || !this.puedeGuardarPlan) return;

    this.guardandoPlan = true;
    this.svc.crearPlanAccion(periodoId, {
      plantillaId: null,
      criterio: this.planCriterio,
      accion: this.planAccionTexto.trim(),
      meta: this.planMeta.trim(),
      fechaLimite: this.planFechaLimite || null,
    }).subscribe({
      next: (item) => {
        this.guardandoPlan = false;
        this.planAccion = [...this.planAccion, item];
        this.cerrarFormPlan();
        Swal.fire({ icon: 'success', title: 'Acción registrada', timer: 1800, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.guardandoPlan = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cambiarEstadoPlan(item: EvJefeSsomaPlanAccionDto, estado: string): void {
    this.svc.actualizarPlanAccion(item.id, {
      accion: item.accion,
      meta: item.meta,
      fechaLimite: item.fechaLimite,
      estado,
    }).subscribe({
      next: (actualizado) => {
        item.estado = actualizado.estado;
        this.cdr.markForCheck();
      },
      error: (err) => this.errorSvc.handleError(err),
    });
  }

  eliminarPlan(item: EvJefeSsomaPlanAccionDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar esta acción del plan?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.eliminarPlanAccion(item.id).subscribe({
        next: () => {
          this.planAccion = this.planAccion.filter((p) => p.id !== item.id);
          this.cdr.markForCheck();
        },
        error: (err) => this.errorSvc.handleError(err),
      });
    });
  }

  estadoClase(estado: string): string {
    if (estado === 'Completado') return 'plan-estado-completado';
    if (estado === 'En progreso') return 'plan-estado-progreso';
    return 'plan-estado-pendiente';
  }
}
