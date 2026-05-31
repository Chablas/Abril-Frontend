import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EvEvaluacionService } from '../../services/ev-evaluacion.service';
import { EvPeriodoService } from '../../services/ev-periodo.service';
import { EvEvaluacionResponseDto } from '../../dtos/ev-evaluacion.model';
import { EvPeriodoDto } from '../../dtos/ev-periodo.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class Historial implements OnInit {
  periodos: EvPeriodoDto[] = [];
  periodoSeleccionado: EvPeriodoDto | null = null;
  evaluaciones: EvEvaluacionResponseDto[] = [];
  loading = false;
  filtroArea = '';
  filtroResidente = '';

  constructor(
    private evalService: EvEvaluacionService,
    private periodoService: EvPeriodoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.periodoService.getAll().subscribe({
      next: (ps) => {
        this.periodos = ps;
        if (ps.length) this.selectPeriodo(ps[0]);
        this.cdr.detectChanges();
      },
    });
  }

  selectPeriodo(p: EvPeriodoDto): void {
    this.periodoSeleccionado = p;
    this.loading = true;
    this.evalService.getByPeriodo(p.id).subscribe({
      next: (e) => {
        this.evaluaciones = e;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get filtradas(): EvEvaluacionResponseDto[] {
    return this.evaluaciones.filter(
      (e) =>
        (!this.filtroArea || e.areaNombre === this.filtroArea) &&
        (!this.filtroResidente ||
          e.evaluadoNombre.toLowerCase().includes(this.filtroResidente.toLowerCase())),
    );
  }

  get areas(): string[] {
    return [...new Set(this.evaluaciones.map((e) => e.areaNombre))].sort();
  }

  scoreClass(nota: number | null): string {
    if (nota === null) return '';
    if (nota >= 16) return 'score-hi';
    if (nota >= 12) return 'score-ok';
    return 'score-lo';
  }
}
