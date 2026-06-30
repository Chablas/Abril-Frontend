import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvContratistaService } from '../../services/ev-contratista.service';
import {
  EvContratistaVerInicioDto,
  EvContratistaResumenDto,
  EvPeriodoDto,
} from '../../dtos/ev-contratista.model';

@Component({
  selector: 'app-ver-evaluacion-contratistas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './ver-evaluacion-contratistas.html',
  styleUrl: './ver-evaluacion-contratistas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerEvaluacionContratistas implements OnInit {
  data: EvContratistaVerInicioDto | null = null;
  loading = true;

  periodoId: number | null = null;
  proyectoId: number | null = null;
  busqueda = '';
  estadoFiltro: string = '';

  readonly areas = ['OF. TÉCNICA', 'SSOMA', 'RESIDENCIA', 'CALIDAD', 'PRODUCCIÓN'];

  get evaluacionesFiltradas(): EvContratistaResumenDto[] {
    if (!this.data?.evaluaciones) return [];
    const q = this.busqueda.trim().toLowerCase();
    return this.data.evaluaciones.filter((e) => {
      const matchQ =
        !q ||
        e.contributorNombre.toLowerCase().includes(q) ||
        e.contributorRuc.includes(q);
      const matchEstado = !this.estadoFiltro || e.estado === this.estadoFiltro;
      return matchQ && matchEstado;
    });
  }

  get periodoActual(): EvPeriodoDto | undefined {
    return this.data?.periodos.find((p) => p.activo) ?? this.data?.periodos[0];
  }

  estadoClase(estado: string): string {
    const map: Record<string, string> = {
      Aprobado: 'estado-aprobado',
      Regular: 'estado-regular',
      Desaprobado: 'estado-desaprobado',
      'Sin evaluar': 'estado-sin',
    };
    return map[estado] ?? '';
  }

  notaClase(nota: number | null): string {
    if (nota === null) return 'nota-sin';
    if (nota > 15) return 'nota-aprobado';
    if (nota >= 12) return 'nota-regular';
    return 'nota-desaprobado';
  }

  constructor(
    private svc: EvContratistaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.svc.getVer(this.periodoId, this.proyectoId).subscribe({
      next: (d) => {
        this.data = d;
        if (!this.periodoId) {
          const activo = d.periodos.find((p) => p.activo);
          this.periodoId = activo?.id ?? d.periodos[0]?.id ?? null;
        }
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

  filtrar(): void {
    this.loader.show();
    this.svc.getVer(this.periodoId, this.proyectoId).subscribe({
      next: (d) => {
        if (this.data) this.data.evaluaciones = d.evaluaciones;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err) => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  notaDisplay(nota: number | null): string {
    return nota !== null ? nota.toFixed(1) : '—';
  }

  countEstado(estado: string): number {
    return this.evaluacionesFiltradas.filter((e) => e.estado === estado).length;
  }
}
