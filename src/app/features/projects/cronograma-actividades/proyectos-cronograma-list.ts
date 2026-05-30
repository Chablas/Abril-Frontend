import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  CronogramaActividadesService,
  ProyectoSimpleDto,
  ActividadDto,
} from '../../../core/services/cronograma-actividades.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';

interface ProyectoRow extends ProyectoSimpleDto {
  avance: number;
}

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

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  abrirCronograma(p: ProyectoRow): void {
    this.router.navigate(['/projects/cronograma-actividades', p.projectId]);
  }
}
