import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { CostosService } from '../../../../../core/services/arquitectura-comercial/costos.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  CostoFiltrosDTO,
  CostoPresupuestoResumenDTO,
  ProyectoCostoFiltroDTO,
} from '../../../../../core/dtos/arquitectura-comercial/costos.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AC_COSTOS_TABS } from '../../../shared/arquitectura-comercial-tabs';

@Component({
  selector: 'app-costos-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './costos-presupuesto.html',
  styleUrl: './costos-presupuesto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostosPresupuesto implements OnInit {
  readonly tabs = AC_COSTOS_TABS;

  proyectos: ProyectoCostoFiltroDTO[] = [];
  proyectoId: number | null = null;

  resumen: CostoPresupuestoResumenDTO | null = null;
  loading = false;
  error = '';

  get puedeConfigurar(): boolean {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('allowed_features') : null;
    const features: string[] = raw ? JSON.parse(raw) : [];
    return features.includes('arquitectura-comercial.costos.configurar');
  }

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

  load(): void {
    if (!this.proyectoId) return;
    this.loading = true;
    this.error = '';
    this.service.getPresupuesto(this.proyectoId).subscribe({
      next: (data) => {
        this.resumen = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error = 'No se pudo cargar el presupuesto del proyecto.';
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  guardarPresupuesto(partida: string, valor: number | string): void {
    if (!this.resumen || !this.proyectoId) return;
    const monto = Number(valor) || 0;
    if (monto < 0) {
      Swal.fire({ icon: 'warning', title: 'El monto no puede ser negativo.' });
      this.load();
      return;
    }
    this.service.upsertPresupuesto({ proyectoId: this.proyectoId, partida, monto }).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.load();
      },
    });
  }

  /** Verde si está dentro de presupuesto (o sin presupuesto definido aún), rojo si se pasó. */
  desviacionClass(desviacion: number, presupuestado: number): string {
    if (presupuestado <= 0) return 'badge-neutro';
    return desviacion > 0 ? 'badge-rojo' : 'badge-verde';
  }
}
