import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  FamiliaConRatioDto,
  RatioFamiliaComparacionDto,
  RatioProyectoItemDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  selector: 'app-ratios-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './ratios-lista.html',
  styleUrl: './ratios-lista.css',
})
export class RatiosListaPage implements OnInit {
  private svc = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);

  familias: FamiliaConRatioDto[] = [];
  loading = false;
  filtro = '';
  tipoSeleccionado = '';
  variableBaseSeleccionada = '';

  detalles: Map<number, RatioFamiliaComparacionDto> = new Map();
  cargandoDetalleIds: Set<number> = new Set();
  actualizandoProjectId: number | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.listarFamiliasConRatio().subscribe({
      next: (f) => {
        this.familias = f;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
        // Todas abiertas por defecto: se carga el detalle de cada una.
        f.forEach((fam) => this.cargarDetalle(fam.familiaId));
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get tiposDisponibles(): string[] {
    return Array.from(new Set(this.familias.map((f) => f.tipoMaterial))).sort();
  }

  get variableBasesDisponibles(): string[] {
    return Array.from(new Set(this.familias.map((f) => f.variableBase))).sort();
  }

  get familiasFiltradas(): FamiliaConRatioDto[] {
    const q = this.filtro.trim().toLowerCase();
    return this.familias.filter((f) => {
      const coincideTexto = !q
        || f.nombreFamilia.toLowerCase().includes(q)
        || f.tipoMaterial.toLowerCase().includes(q);
      const coincideTipo = !this.tipoSeleccionado || f.tipoMaterial === this.tipoSeleccionado;
      const coincideVariableBase = !this.variableBaseSeleccionada
        || f.variableBase === this.variableBaseSeleccionada;
      return coincideTexto && coincideTipo && coincideVariableBase;
    });
  }

  onFiltroChange(valor: string): void {
    this.filtro = valor;
    this.cdr.markForCheck();
  }

  onTipoChange(valor: string): void {
    this.tipoSeleccionado = valor;
    this.cdr.markForCheck();
  }

  onVariableBaseChange(valor: string): void {
    this.variableBaseSeleccionada = valor;
    this.cdr.markForCheck();
  }

  private cargarDetalle(familiaId: number): void {
    this.cargandoDetalleIds.add(familiaId);
    this.cdr.markForCheck();
    this.svc.getComparacionFamilia(familiaId).subscribe({
      next: (d) => {
        this.detalles.set(familiaId, d);
        this.cargandoDetalleIds.delete(familiaId);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoDetalleIds.delete(familiaId);
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleIncluidoRatio(familiaId: number, p: RatioProyectoItemDto): void {
    this.toggleIncluido(familiaId, p.projectId, !p.incluidoManualRatio, 'RATIO');
  }

  toggleIncluidoPrecio(familiaId: number, p: RatioProyectoItemDto): void {
    this.toggleIncluido(familiaId, p.projectId, !p.incluidoManualPrecio, 'PRECIO');
  }

  private toggleIncluido(
    familiaId: number,
    projectId: number,
    nuevoValor: boolean,
    campo: 'RATIO' | 'PRECIO',
  ): void {
    if (this.actualizandoProjectId === projectId) return;
    this.actualizandoProjectId = projectId;
    this.cdr.markForCheck();
    this.svc.actualizarIncluidoManual(familiaId, projectId, nuevoValor, campo).subscribe({
      next: () => {
        this.actualizandoProjectId = null;
        this.cargarDetalle(familiaId);
      },
      error: (err: HttpErrorResponse) => {
        this.actualizandoProjectId = null;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  driverLabel(variableBase: string): string {
    switch (variableBase) {
      case 'HH': return 'Horas-Hombre';
      case 'AREATECHADA': return 'Área Techada (m²)';
      case 'TRABAJADORES': return 'Trabajadores';
      case 'CALCULADO': return 'Calculado (sin ratio real)';
      case 'FIJO': return 'Monto fijo';
      case 'METRADO': return 'Metrado';
      default: return variableBase;
    }
  }

  /**
   * HH y área techada dan ratios diminutos (ej. 0.00003 por HH) — se escalan x1000 solo
   * para que se puedan leer. El valor guardado en la base no cambia, esto es solo pantalla.
   */
  escalaRatio(variableBase: string): number {
    return variableBase === 'HH' || variableBase === 'AREATECHADA' ? 1000 : 1;
  }

  /**
   * Qué tan confiable es la mediana según cuántos proyectos la respaldan.
   * No es un cálculo estadístico formal, es una guía simple para no confiar
   * igual en una mediana de 2 proyectos que en una de 15.
   */
  confianzaLabel(nProyectos: number): string {
    if (nProyectos >= 6) return 'Alta';
    if (nProyectos >= 3) return 'Media';
    return 'Baja';
  }

  confianzaClass(nProyectos: number): string {
    if (nProyectos >= 6) return 'badge-ok';
    if (nProyectos >= 3) return 'badge-warn';
    return 'badge-danger';
  }
}
