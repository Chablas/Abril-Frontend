import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PuntajeMesDto } from '../../indicadores-proactivos.dtos';

@Component({
  selector: 'app-puntaje-mes',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './puntaje-mes.component.html',
  styleUrls: ['./puntaje-mes.component.css'],
})
export class PuntajeMesComponent implements OnInit {
  private svc = inject(IndicadoresProactivosService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);

  mes = signal<number>(new Date().getMonth() + 1);
  anio = signal<number>(new Date().getFullYear());
  puntajes = signal<PuntajeMesDto[]>([]);
  proyectoSeleccionado = signal<PuntajeMesDto | null>(null);

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  anios = [2024, 2025, 2026, 2027];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.proyectoSeleccionado.set(null);
    this.svc.getPuntajeTodos(this.mes(), this.anio()).subscribe({
      next: data => {
        const sorted = [...data].sort((a, b) => b.puntajeTotal - a.puntajeTotal);
        this.puntajes.set(sorted);
        if (sorted.length) this.proyectoSeleccionado.set(sorted[0]);
        this.loader.hide();
      },
      error: err => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  seleccionar(p: PuntajeMesDto): void {
    this.proyectoSeleccionado.set(p);
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  // Posición en el ranking
  posicion(p: PuntajeMesDto): number {
    return this.puntajes().indexOf(p) + 1;
  }

  // Color del score total
  scoreClass(score: number): string {
    if (score >= 90) return 'score--verde';
    if (score >= 70) return 'score--amarillo';
    if (score >= 50) return 'score--naranja';
    return 'score--rojo';
  }

  // Ancho barra (max 110 pts)
  barPct(valor: number, max: number): string {
    return `${Math.min(100, (valor / max) * 100)}%`;
  }

  // Gauge arc para el marcador circular (circumference 251.2 para r=40)
  gaugeOffset(score: number): number {
    const pct = Math.min(score / 110, 1);
    return 251.2 * (1 - pct);
  }

  gaugeColor(score: number): string {
    if (score >= 90) return '#16a34a';
    if (score >= 70) return '#ca8a04';
    if (score >= 50) return '#ea580c';
    return '#dc2626';
  }

  get ranking(): PuntajeMesDto[] {
    return this.puntajes();
  }
}
