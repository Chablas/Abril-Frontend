import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvGestionSsomaService } from '../../services/ev-gestion-ssoma.service';
import {
  EvGestionSsomaInicioDto,
  EvGestionSsomaAEvaluarDto,
  EvSupervisorContratistaCriterioDto,
  EvGestionSsomaDetalleCreateDto,
} from '../../dtos/ev-gestion-ssoma.model';
import Swal from 'sweetalert2';

interface DetalleForm {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
}

interface CandidatoUi extends EvGestionSsomaAEvaluarDto {
  tipo: 'Prevencionista' | 'Coordinador SSOMA';
}

const PUNTAJE_LABELS: Record<number, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
};

@Component({
  selector: 'app-gestion-ssoma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './gestion-ssoma.html',
  styleUrl: './gestion-ssoma.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionSsoma implements OnInit {
  inicio: EvGestionSsomaInicioDto | null = null;
  loading = true;
  guardando = false;

  // Modo lista: Jefe SSOMA (ve Prevencionistas + Coordinadores) o Coordinador
  // SSOMA (ve solo Prevencionistas de su proyecto) — elige a quién evaluar.
  seleccionado: CandidatoUi | null = null;
  busqueda = '';

  // Modo anónimo: Prevencionista evaluando a su Coordinador SSOMA — un solo
  // objetivo implícito, sin lista que elegir.
  modoAnonimo = false;

  detalles: DetalleForm[] = [];
  fortalezas = '';
  oportunidadesMejora = '';

  readonly puntajes = [1, 2, 3, 4, 5];
  readonly puntajeLabel = PUNTAJE_LABELS;

  get candidatos(): CandidatoUi[] {
    const prev = (this.inicio?.prevencionistas ?? []).map((p) => ({ ...p, tipo: 'Prevencionista' as const }));
    const coord = (this.inicio?.coordinadores ?? []).map((c) => ({ ...c, tipo: 'Coordinador SSOMA' as const }));
    return [...prev, ...coord];
  }

  get candidatosFiltrados(): CandidatoUi[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.candidatos;
    return this.candidatos.filter(
      (c) =>
        c.nombreCompleto.toLowerCase().includes(q) ||
        (c.proyectoNombre ?? '').toLowerCase().includes(q),
    );
  }

  get notaCalculada(): number {
    const validos = this.detalles.filter((d) => d.puntaje !== null);
    if (!validos.length) return 0;
    const sum = validos.reduce((s, d) => s + d.puntaje!, 0);
    return Math.round((sum / validos.length) * 4 * 100) / 100;
  }

  get puedeGuardar(): boolean {
    return this.detalles.length > 0 && this.detalles.every((d) => d.puntaje !== null);
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
    private svc: EvGestionSsomaService,
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

        // Caso anónimo (Prevencionista -> su Coordinador): no hay lista que
        // elegir, se arma el formulario directo si aún no evaluó.
        this.modoAnonimo = !!data.miCoordinador;
        if (this.modoAnonimo && !data.yaEvalueMiCoordinador) {
          this.detalles = this.nuevosDetalles();
          this.fortalezas = '';
          this.oportunidadesMejora = '';
        }

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

  private nuevosDetalles(): DetalleForm[] {
    return (this.inicio?.plantilla ?? []).map((p: EvSupervisorContratistaCriterioDto) => ({
      plantillaId: p.id,
      criterio: p.criterio,
      puntaje: null,
    }));
  }

  seleccionarCandidato(c: CandidatoUi): void {
    if (c.yaEvalue) return;
    this.seleccionado = c;
    this.busqueda = '';
    this.detalles = this.nuevosDetalles();
    this.fortalezas = '';
    this.oportunidadesMejora = '';
    this.cdr.markForCheck();
  }

  cambiarCandidato(): void {
    this.seleccionado = null;
    this.detalles = [];
    this.fortalezas = '';
    this.oportunidadesMejora = '';
    this.cdr.markForCheck();
  }

  setPuntaje(idx: number, val: number): void {
    this.detalles[idx].puntaje = val;
    this.cdr.markForCheck();
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    if (!this.modoAnonimo && !this.seleccionado) return;

    const detallesDto: EvGestionSsomaDetalleCreateDto[] = this.detalles.map((d) => ({
      plantillaId: d.plantillaId,
      criterio: d.criterio,
      puntaje: d.puntaje!,
    }));

    const dto = {
      evaluadoUserId: this.modoAnonimo ? null : this.seleccionado!.userId,
      fortalezas: this.fortalezas.trim() || null,
      oportunidadesMejora: this.oportunidadesMejora.trim() || null,
      detalles: detallesDto,
    };

    const registrar = () => {
      this.guardando = true;
      this.loader.show();
      this.svc.crear(dto).subscribe({
        next: () => {
          this.guardando = false;
          this.loader.hide();
          Swal.fire({
            icon: 'success',
            title: 'Evaluación registrada',
            timer: 2500,
            showConfirmButton: false,
          });
          this.seleccionado = null;
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
    };

    if (this.modoAnonimo) {
      Swal.fire({
        icon: 'question',
        title: 'Registrar evaluación anónima',
        text: 'Esta evaluación es anónima: tu Coordinador SSOMA no podrá saber que la registraste tú. ¿Confirmas?',
        showCancelButton: true,
        confirmButtonText: 'Sí, registrar',
        cancelButtonText: 'Revisar',
      }).then((result) => {
        if (result.isConfirmed) registrar();
      });
    } else {
      registrar();
    }
  }
}
