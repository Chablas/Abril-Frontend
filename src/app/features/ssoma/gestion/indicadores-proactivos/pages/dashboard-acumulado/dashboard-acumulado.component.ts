import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PuntajeMesDto, IndicadorProactivoProyectoDto } from '../../indicadores-proactivos.dtos';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard-acumulado',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './dashboard-acumulado.component.html',
  styleUrls: ['./dashboard-acumulado.component.css'],
})
export class DashboardAcumuladoComponent implements OnInit {
  private svc = inject(IndicadoresProactivosService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);

  mes = signal<number>(new Date().getMonth() + 1);
  anio = signal<number>(new Date().getFullYear());
  puntajes = signal<PuntajeMesDto[]>([]);
  seguimiento = signal<IndicadorProactivoProyectoDto[]>([]);

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  anios = [2024, 2025, 2026, 2027];

  // KPIs calculados
  kpis = computed(() => {
    const pts = this.puntajes();
    if (!pts.length) return null;
    const total = pts.reduce((s, p) => s + p.puntajeTotal, 0);
    const sorted = [...pts].sort((a, b) => b.puntajeTotal - a.puntajeTotal);
    return {
      totalProyectos: pts.length,
      promedio: total / pts.length,
      excelentes: pts.filter(p => p.puntajeTotal >= 90).length,
      criticos: pts.filter(p => p.puntajeTotal < 70).length,
      mejor: sorted[0],
      peor: sorted[sorted.length - 1],
    };
  });

  // Tabla combinada puntaje + seguimiento ordenada por puntaje
  tablaCombinada = computed(() => {
    const pts = [...this.puntajes()].sort((a, b) => b.puntajeTotal - a.puntajeTotal);
    const seg = this.seguimiento();
    return pts.map((p, i) => {
      const s = seg.find(x => x.proyectoId === p.proyectoId);
      return { ...p, ranking: i + 1, pctProactivoGeneral: s?.pctProactivoGeneral ?? 0 };
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    forkJoin({
      puntajes: this.svc.getPuntajeTodos(this.mes(), this.anio()),
      seguimiento: this.svc.getSeguimiento(this.mes(), this.anio()),
    }).subscribe({
      next: ({ puntajes, seguimiento }) => {
        this.puntajes.set(puntajes);
        this.seguimiento.set(seguimiento);
        this.loader.hide();
      },
      error: err => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  scoreClass(score: number): string {
    if (score >= 90) return 'score--verde';
    if (score >= 70) return 'score--amarillo';
    if (score >= 50) return 'score--naranja';
    return 'score--rojo';
  }

  barPct(val: number, max: number): string {
    return `${Math.min(100, (val / max) * 100)}%`;
  }

  medalIcon(pos: number): string {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `${pos}°`;
  }
}
