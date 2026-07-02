import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  PuntajeMesDto,
  IndicadorProactivoProyectoDto,
  IndicadorReactivoProyectoDto,
} from '../../indicadores-proactivos.dtos';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard-acumulado',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  reactivos = signal<IndicadorReactivoProyectoDto[]>([]);

  meses = [
    { valor: 1, nombre: 'Enero' },   { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },   { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },   { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  anios = [2024, 2025, 2026, 2027];

  tablaCombinada = computed(() => {
    const seg = this.seguimiento();
    const segIds = new Set(seg.map(s => s.proyectoId));
    const rx = this.reactivos();
    return [...this.puntajes()]
      .filter(p => segIds.has(p.proyectoId))
      .sort((a, b) => b.puntajeTotal - a.puntajeTotal)
      .map((p, i) => {
        const s = seg.find(x => x.proyectoId === p.proyectoId);
        const r = rx.find(x => x.proyectoId === p.proyectoId);
        return {
          ...p,
          ranking: i + 1,
          pctProactivoGeneral: s?.pctProactivoGeneral ?? 0,
          nombreCorto: this.nombreCorto(p.proyectoNombre),
          if: +(r?.indiceFrecuencia ?? 0),
          ig: +(r?.indiceGravedad ?? 0),
          ia: +(r?.indiceAccidentabilidad ?? 0),
          hht: r?.horasHombreTrabajadas ?? 0,
          accidentes: r?.totalAccidentes ?? 0,
          diasPerdidos: r?.totalDiasPerdidos ?? 0,
        };
      });
  });

  reactivosTotales = computed(() => {
    const rx = this.reactivos();
    if (!rx.length) return null;
    const totalHHT = rx.reduce((s, r) => s + r.horasHombreTrabajadas, 0);
    const totalAcc = rx.reduce((s, r) => s + r.totalAccidentes, 0);
    const totalDias = rx.reduce((s, r) => s + r.totalDiasPerdidos, 0);
    const IF = totalHHT > 0 ? +((totalAcc * 1_000_000) / totalHHT).toFixed(1) : 0;
    const IG = totalHHT > 0 ? +((totalDias * 1_000_000) / totalHHT).toFixed(1) : 0;
    const IA = +(IF * IG / 1000).toFixed(2);
    return { IF, IG, IA, totalHHT, totalAcc, totalDias };
  });

  mejorPasso = computed(() => {
    const t = this.tablaCombinada();
    return t.length
      ? [...t].sort((a, b) => b.pctPasso - a.pctPasso)[0]
      : { proyectoNombre: '—', pctPasso: 0 };
  });

  mejorProactivo = computed(() => {
    const t = this.tablaCombinada();
    return t.length ? t[0] : { proyectoNombre: '—', pctProactivoGeneral: 0 };
  });

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loader.show();
    forkJoin({
      puntajes: this.svc.getPuntajeTodos(this.mes(), this.anio()),
      seguimiento: this.svc.getSeguimiento(this.mes(), this.anio()),
      reactivos: this.svc.getReactivosTodos(this.mes(), this.anio()),
    }).subscribe({
      next: ({ puntajes, seguimiento, reactivos }) => {
        this.puntajes.set(puntajes);
        this.seguimiento.set(seguimiento);
        this.reactivos.set(reactivos);
        this.loader.hide();
      },
      error: err => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  nombreCorto(nombre: string): string {
    const w = nombre.trim().split(/\s+/);
    return w.length === 1 ? nombre.substring(0, 12) : w.slice(0, 2).join(' ');
  }

  // Semicircular gauge: r=30, half-circumference = π×30 ≈ 94.25
  readonly HALF30 = +(Math.PI * 30).toFixed(2);
  gaugeHalfDash(pct: number): string {
    const filled = +(Math.min(100, Math.max(0, pct)) / 100 * this.HALF30).toFixed(2);
    return `${filled} 188.5`;
  }

  // ── Semáforos generales (más = mejor) ───────────────────────────────────
  private sem(pct: number): 'ok' | 'warn' | 'alert' {
    return pct >= 75 ? 'ok' : pct >= 50 ? 'warn' : 'alert';
  }
  gaugeArcClass(pct: number): string { return `g-arc--${this.sem(pct)}`; }
  gTextClass(pct: number): string    { return `g-pct--${this.sem(pct)}`; }
  barClass(pct: number): string      { return `bar-fill--${this.sem(pct)}`; }
  semClass(pct: number): string      { return `sem--${this.sem(pct)}`; }
  tileClass(pct: number): string     { return `tile--${this.sem(pct)}`; }
  tileValClass(pct: number): string  { return `tv--${this.sem(pct)}`; }
  chipClass(pct: number): string     { return `chip--${this.sem(pct)}`; }
  scoreColorClass(pts: number): string { return pts >= 90 ? 'sc--ok' : pts >= 70 ? 'sc--warn' : 'sc--alert'; }
  scoreBarClass(pts: number): string   { return pts >= 90 ? 'sf--ok' : pts >= 70 ? 'sf--warn' : 'sf--alert'; }
  rkClass(pts: number): string         { return `rk-row--${this.scoreColorClass(pts).replace('sc--', '')}`; }

  // ── Reactivos (mayor = peor) ─────────────────────────────────────────────
  ifColorClass(val: number): string {
    if (val === 0) return 'rx--cero';
    return val <= 5 ? 'rx--ok' : val <= 15 ? 'rx--warn' : 'rx--alert';
  }
  igColorClass(val: number): string {
    if (val === 0) return 'rx--cero';
    return val <= 100 ? 'rx--ok' : val <= 250 ? 'rx--warn' : 'rx--alert';
  }
  iaColorClass(val: number): string {
    if (val === 0) return 'rx--cero';
    return val <= 2 ? 'rx--ok' : val <= 5 ? 'rx--warn' : 'rx--alert';
  }
}
