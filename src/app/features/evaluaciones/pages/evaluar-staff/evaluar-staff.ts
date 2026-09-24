import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent, AbrilPageTabGroup } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvEvaluacionStaffService } from '../../services/ev-evaluacion-staff.service';
import { EvAccesoService } from '../../services/ev-acceso.service';
import { buildEvaluacionesTabGroups } from '../../shared/evaluaciones-tabs';
import {
  EvEvaluacionStaffPendienteDto,
  EvEvaluacionStaffCriterioDto,
  EvEvaluacionStaffDetalleCreateDto,
} from '../../dtos/ev-evaluacion-staff.model';
import Swal from 'sweetalert2';

interface DetalleForm {
  plantillaId: number;
  criterio: string;
  tipo: 'FUNCIONAL' | 'TRANSVERSAL';
  puntaje: number | null;
}

const PUNTAJE_LABELS: Record<number, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
};

@Component({
  selector: 'app-evaluar-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './evaluar-staff.html',
  styleUrl: './evaluar-staff.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluarStaff implements OnInit {
  pendientes: EvEvaluacionStaffPendienteDto[] = [];
  loading = true;
  cargandoPlantilla = false;
  guardando = false;
  tabGroups: AbrilPageTabGroup[] = buildEvaluacionesTabGroups(null);

  trabajadorSeleccionado: EvEvaluacionStaffPendienteDto | null = null;
  detalles: DetalleForm[] = [];
  comentario = '';

  readonly puntajes = [1, 2, 3, 4, 5];
  readonly puntajeLabel = PUNTAJE_LABELS;

  get detallesFuncionales(): DetalleForm[] {
    return this.detalles.filter((d) => d.tipo === 'FUNCIONAL');
  }

  get detallesTransversales(): DetalleForm[] {
    return this.detalles.filter((d) => d.tipo === 'TRANSVERSAL');
  }

  get notaCalculada(): number {
    const validos = this.detalles.filter((d) => d.puntaje !== null);
    if (!validos.length) return 0;
    const sum = validos.reduce((s, d) => s + d.puntaje!, 0);
    return Math.round((sum / validos.length) * 100) / 100;
  }

  get puedeGuardar(): boolean {
    return this.detalles.length > 0 && this.detalles.every((d) => d.puntaje !== null);
  }

  estadoClase(nota: number | null): string {
    if (nota === null) return '';
    if (nota >= 4) return 'estado-aprobado';
    if (nota >= 3) return 'estado-regular';
    return 'estado-desaprobado';
  }

  estadoLabel(nota: number | null): string {
    if (nota === null) return 'Sin evaluar';
    if (nota >= 4) return 'Bueno';
    if (nota >= 3) return 'Regular';
    return 'Desaprobado';
  }

  constructor(
    private svc: EvEvaluacionStaffService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
    private accesoSvc: EvAccesoService,
  ) {}

  ngOnInit(): void {
    this.cargarPendientes();
    this.accesoSvc.getAcceso().subscribe((acceso) => {
      this.tabGroups = buildEvaluacionesTabGroups(acceso);
      this.cdr.markForCheck();
    });
  }

  cargarPendientes(): void {
    this.loader.show();
    this.svc.getPendientes().subscribe({
      next: (data) => {
        this.pendientes = data;
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

  seleccionarTrabajador(t: EvEvaluacionStaffPendienteDto): void {
    this.trabajadorSeleccionado = t;
    this.comentario = '';
    this.detalles = [];
    this.cargandoPlantilla = true;
    this.cdr.markForCheck();

    this.svc.getPlantilla(t.puestoId).subscribe({
      next: (criterios) => {
        this.detalles = (criterios ?? [])
          .slice()
          .sort((a: EvEvaluacionStaffCriterioDto, b: EvEvaluacionStaffCriterioDto) => a.orden - b.orden)
          .map((c: EvEvaluacionStaffCriterioDto) => ({
            plantillaId: c.id,
            criterio: c.criterio,
            tipo: c.tipo,
            puntaje: null,
          }));
        this.cargandoPlantilla = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoPlantilla = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  setPuntaje(detalle: DetalleForm, val: number): void {
    detalle.puntaje = val;
    this.cdr.markForCheck();
  }

  cambiarTrabajador(): void {
    this.trabajadorSeleccionado = null;
    this.detalles = [];
    this.comentario = '';
    this.cdr.markForCheck();
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.trabajadorSeleccionado) return;

    const detallesDto: EvEvaluacionStaffDetalleCreateDto[] = this.detalles.map((d) => ({
      plantillaId: d.plantillaId,
      puntaje: d.puntaje!,
    }));

    Swal.fire({
      icon: 'question',
      title: 'Registrar evaluación',
      text: `Vas a registrar la evaluación de ${this.trabajadorSeleccionado.nombreCompleto}. Esta evaluación queda identificada con tu usuario. ¿Confirmas?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Revisar',
    }).then((result) => {
      if (!result.isConfirmed || !this.trabajadorSeleccionado) return;

      this.guardando = true;
      this.loader.show();

      this.svc
        .crear({
          evaluadoWorkerId: this.trabajadorSeleccionado.workerId,
          comentario: this.comentario || null,
          detalles: detallesDto,
        })
        .subscribe({
          next: () => {
            this.guardando = false;
            this.loader.hide();
            Swal.fire({
              icon: 'success',
              title: 'Evaluación registrada',
              timer: 2200,
              showConfirmButton: false,
            });
            this.cambiarTrabajador();
            this.cargarPendientes();
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.guardando = false;
            this.loader.hide();
            this.errorSvc.handleError(err);
            this.cdr.markForCheck();
          },
        });
    });
  }
}
