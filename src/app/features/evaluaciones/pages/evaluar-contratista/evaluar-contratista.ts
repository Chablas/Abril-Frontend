import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvContratistaService } from '../../services/ev-contratista.service';
import {
  EvContratistaInicioDto,
  EvContratistaAEvaluarDto,
  EvContratistaCriterioDto,
  EvContratistaDetalleCreateDto,
} from '../../dtos/ev-contratista.model';
import Swal from 'sweetalert2';

interface DetalleForm {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
}

const PUNTAJE_LABELS: Record<number, string> = {
  0: 'Inaceptable',
  1: 'Malo',
  2: 'Regular',
  3: 'Bueno',
  4: 'Excelente',
};

@Component({
  selector: 'app-evaluar-contratista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './evaluar-contratista.html',
  styleUrl: './evaluar-contratista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluarContratista implements OnInit {
  inicio: EvContratistaInicioDto | null = null;
  loading = true;
  guardando = false;

  contraHistaSeleccionada: EvContratistaAEvaluarDto | null = null;
  detalles: DetalleForm[] = [];
  comentario = '';
  busqueda = '';
  dropdownAbierto = false;

  readonly puntajes = [0, 1, 2, 3, 4];
  readonly puntajeLabel = PUNTAJE_LABELS;

  get contraHistasFiltradas(): EvContratistaAEvaluarDto[] {
    if (!this.inicio?.contratistasAEvaluar) return [];
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.inicio.contratistasAEvaluar;
    return this.inicio.contratistasAEvaluar.filter(
      (c) =>
        c.contributorNombre.toLowerCase().includes(q) ||
        c.contributorRuc.includes(q) ||
        c.proyectoNombre.toLowerCase().includes(q),
    );
  }

  get notaCalculada(): number {
    const validos = this.detalles.filter((d) => d.puntaje !== null);
    if (!validos.length) return 0;
    const sum = validos.reduce((s, d) => s + d.puntaje!, 0);
    const max = validos.length * 4;
    return Math.round((sum / max) * 20 * 10) / 10;
  }

  get puedeGuardar(): boolean {
    return (
      !!this.contraHistaSeleccionada &&
      this.detalles.every((d) => d.puntaje !== null) &&
      this.detalles.length > 0
    );
  }

  estadoClase(nota: number | null): string {
    if (nota === null) return '';
    if (nota > 15) return 'estado-aprobado';
    if (nota >= 12) return 'estado-regular';
    return 'estado-desaprobado';
  }

  estadoLabel(nota: number | null): string {
    if (nota === null) return 'Sin evaluar';
    if (nota > 15) return 'Aprobado';
    if (nota >= 12) return 'Regular';
    return 'Desaprobado';
  }

  constructor(
    private svc: EvContratistaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarInicio();
  }

  cargarInicio(): void {
    this.loader.show();
    this.svc.getInicio().subscribe({
      next: (data) => {
        this.inicio = data;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  seleccionarContratista(c: EvContratistaAEvaluarDto): void {
    this.contraHistaSeleccionada = c;
    this.busqueda = '';
    this.dropdownAbierto = false;
    this.comentario = '';
    this.detalles = (this.inicio?.plantilla ?? []).map((p: EvContratistaCriterioDto) => ({
      plantillaId: p.id,
      criterio: p.criterio,
      puntaje: null,
    }));
    this.cdr.markForCheck();
  }

  cambiarContratista(): void {
    this.contraHistaSeleccionada = null;
    this.detalles = [];
    this.comentario = '';
    this.cdr.markForCheck();
  }

  markForCheck(): void {
    this.cdr.markForCheck();
  }

  cerrarDropdown(): void {
    setTimeout(() => {
      this.dropdownAbierto = false;
      this.cdr.markForCheck();
    }, 150);
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.contraHistaSeleccionada) return;

    const detallesDto: EvContratistaDetalleCreateDto[] = this.detalles.map((d) => ({
      plantillaId: d.plantillaId,
      criterio: d.criterio,
      puntaje: d.puntaje!,
    }));

    this.guardando = true;
    this.loader.show();

    this.svc
      .crear({
        proyectoId: this.contraHistaSeleccionada.proyectoId,
        contributorId: this.contraHistaSeleccionada.contributorId,
        comentario: this.comentario || null,
        detalles: detallesDto,
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          this.loader.hide();
          Swal.fire({
            icon: 'success',
            title: 'Evaluación registrada',
            text: `Nota ${this.inicio?.miAreaNombre}: ${res.nota} / 20`,
            timer: 2500,
            showConfirmButton: false,
          });
          this.cambiarContratista();
          this.cargarInicio();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.guardando = false;
          this.loader.hide();
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }
}
