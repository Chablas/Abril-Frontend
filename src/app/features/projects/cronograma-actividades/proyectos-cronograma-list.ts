import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CronogramaActividadesService } from './services/cronograma-actividades.service';
import {
  ProyectoSimpleDto,
  ActividadDto,
} from './dtos/cronograma-actividades.dtos';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';

interface ProyectoRow extends ProyectoSimpleDto {
  avance: number;
}

const PROJECT_COLORS = [
  '#3B82F6', // azul
  '#14B8A6', // teal
  '#F59E0B', // ámbar
  '#A855F7', // púrpura
  '#EF4444', // rojo
  '#10B981', // esmeralda
  '#F97316', // naranja
  '#6366F1', // índigo
];

@Component({
  selector: 'app-proyectos-cronograma-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proyectos-cronograma-list.html',
  styleUrl: './proyectos-cronograma-list.css',
})
export class ProyectosCronogramaList implements OnInit {
  proyectos: ProyectoRow[] = [];
  loading = false;

  constructor(
    private service: CronogramaActividadesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getProyectos().subscribe({
      next: (proyectos) => {
        if (!proyectos.length) {
          this.proyectos = [];
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          return;
        }
        // Una llamada por proyecto para obtener el avance del nodo de nivel 0.
        // Si un proyecto falla o no tiene actividades, su avance es 0%.
        const calls = proyectos.map((p) =>
          this.service.getActividades(p.projectId).pipe(
            map((acts) => ({ ...p, avance: this.calcularAvanceNivel0(acts ?? []) }) as ProyectoRow),
            catchError(() => of({ ...p, avance: 0 } as ProyectoRow)),
          ),
        );
        forkJoin(calls).subscribe({
          next: (rows) => {
            this.proyectos = rows;
            this.loading = false;
            this.loaderService.hide();
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.loading = false;
            this.errorService.handleError(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Avance del/los nodo(s) de nivel 0, calculado recursivamente (promedio simple
   * de hijos directos en cada nivel). Devuelve 0 si el proyecto no tiene actividades.
   */
  private calcularAvanceNivel0(acts: ActividadDto[]): number {
    const nivel0 = acts.filter((a) => a.hierarchyLevel === 0);
    if (!nivel0.length) return 0;

    const memo = new Map<number, number>();
    const calc = (id: number): number => {
      if (memo.has(id)) return memo.get(id)!;
      const hijos = acts.filter((a) => a.parentId === id);
      let result: number;
      if (!hijos.length) {
        const a = acts.find((x) => x.projectActivityId === id);
        result = a ? (a.actualEndDate ? 100 : (a.progressPercentage ?? 0)) : 0;
      } else {
        const suma = hijos.reduce((s, h) => s + calc(h.projectActivityId), 0);
        result = Math.round(suma / hijos.length);
      }
      memo.set(id, result);
      return result;
    };

    const suma = nivel0.reduce((s, n) => s + calc(n.projectActivityId), 0);
    return Math.round(suma / nivel0.length);
  }

  getProjectColor(index: number): string {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
  }

  getProjectColorGlow(index: number): string {
    const hex = PROJECT_COLORS[index % PROJECT_COLORS.length];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.38)`;
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  abrirCronograma(p: ProyectoRow): void {
    this.router.navigate(['/projects/cronograma-actividades', p.projectId]);
  }
}
