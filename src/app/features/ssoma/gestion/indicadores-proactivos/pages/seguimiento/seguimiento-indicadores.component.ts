import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { IndicadorProactivoProyectoDto } from '../../indicadores-proactivos.dtos';

@Component({
  selector: 'app-seguimiento-indicadores',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './seguimiento-indicadores.component.html',
  styleUrls: ['./seguimiento-indicadores.component.css'],
})
export class SeguimientoIndicadoresComponent implements OnInit {
  private svc = inject(IndicadoresProactivosService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);

  mes = signal<number>(new Date().getMonth() + 1);
  anio = signal<number>(new Date().getFullYear());
  proyectos = signal<IndicadorProactivoProyectoDto[]>([]);
  proyectoExpandido = signal<number | null>(null);

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
    this.svc.getSeguimiento(this.mes(), this.anio()).subscribe({
      next: data => {
        this.proyectos.set(data);
        this.loader.hide();
      },
      error: err => {
        this.loader.hide();
        this.errorSvc.handleError(err);
      },
    });
  }

  toggleExpandir(proyectoId: number): void {
    this.proyectoExpandido.set(
      this.proyectoExpandido() === proyectoId ? null : proyectoId,
    );
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  pctClass(pct: number): string {
    if (pct >= 100) return 'pct--verde';
    if (pct >= 75) return 'pct--amarillo';
    if (pct >= 50) return 'pct--naranja';
    return 'pct--rojo';
  }

  barWidth(pct: number): string {
    return `${Math.min(100, pct)}%`;
  }

  /** Ranking: ordena de mayor a menor pctProactivoGeneral */
  get ranking(): IndicadorProactivoProyectoDto[] {
    return [...this.proyectos()].sort((a, b) => b.pctProactivoGeneral - a.pctProactivoGeneral);
  }
}
