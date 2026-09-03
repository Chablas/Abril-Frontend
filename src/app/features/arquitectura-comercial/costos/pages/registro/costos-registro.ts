import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CostosService } from '../../../../../core/services/arquitectura-comercial/costos.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { CostoFiltrosDTO, CostoMatrizDTO, ProyectoCostoFiltroDTO } from '../../../../../core/dtos/arquitectura-comercial/costos.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AC_COSTOS_TABS } from '../../../shared/arquitectura-comercial-tabs';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-costos-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './costos-registro.html',
  styleUrl: './costos-registro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostosRegistro implements OnInit {
  readonly tabs = AC_COSTOS_TABS;
  readonly nombresMes = NOMBRES_MES;

  proyectos: ProyectoCostoFiltroDTO[] = [];
  proyectoId: number | null = null;
  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1;

  matriz: CostoMatrizDTO | null = null;
  loading = false;
  error = '';

  constructor(
    private service: CostosService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFiltros();
  }

  loadFiltros(): void {
    this.service.getFiltros().subscribe({
      next: (data: CostoFiltrosDTO) => {
        this.proyectos = [...data.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (this.proyectos.length && this.proyectoId == null) {
          this.proyectoId = this.proyectos[0].id;
          this.load();
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.load();
  }

  onPeriodoChange(): void {
    this.load();
  }

  load(): void {
    if (!this.proyectoId) return;
    this.loading = true;
    this.error = '';
    this.service.getMatriz(this.proyectoId, this.anio, this.mes).subscribe({
      next: (data) => {
        this.matriz = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error = 'No se pudo cargar la matriz de costos.';
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  semanas(): number[] {
    return this.matriz ? Array.from({ length: this.matriz.numeroSemanas }, (_, i) => i + 1) : [];
  }

  montoSemana(partida: string, semana: number): number {
    const fila = this.matriz?.partidas.find((p) => p.partida === partida);
    return fila?.montosPorSemana?.[semana] ?? 0;
  }

  totalMes(partida: string): number {
    return this.matriz?.partidas.find((p) => p.partida === partida)?.totalMes ?? 0;
  }

  montoProyeccion(partida: string): number {
    return this.matriz?.proyecciones.find((p) => p.partida === partida)?.monto ?? 0;
  }

  totalSemanaColumna(semana: number): number {
    return this.matriz?.partidas.reduce((acc, p) => acc + (p.montosPorSemana?.[semana] ?? 0), 0) ?? 0;
  }

  guardarRegistro(partida: string, semana: number, valor: number | string): void {
    if (!this.matriz || !this.proyectoId) return;
    const monto = Number(valor) || 0;
    this.service
      .upsertRegistro({ proyectoId: this.proyectoId, anio: this.matriz.anio, mes: this.matriz.mes, semana, partida, monto })
      .subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
          this.load();
        },
      });
  }

  guardarProyeccion(partida: string, valor: number | string): void {
    if (!this.matriz || !this.proyectoId) return;
    const monto = Number(valor) || 0;
    this.service
      .upsertProyeccion({
        proyectoId: this.proyectoId,
        anio: this.matriz.anioProyeccion,
        mes: this.matriz.mesProyeccion,
        partida,
        monto,
      })
      .subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
          this.load();
        },
      });
  }

  mesLabel(mes: number): string {
    return `${(this.nombresMes[mes - 1] || '').slice(0, 3)}-${String(this.anio).slice(2)}`;
  }

  mesProyeccionLabel(): string {
    if (!this.matriz) return '';
    return `${(this.nombresMes[this.matriz.mesProyeccion - 1] || '').slice(0, 3)}-${String(this.matriz.anioProyeccion).slice(2)}`;
  }
}
