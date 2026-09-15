import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AlmacenService } from '../../../../core/services/almacen/almacen.service';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import {
  AlmacenFiltrosDTO,
  AlmacenMaterialDTO,
  AlmacenMovimientoListItemDTO,
  AlmacenStockDTO,
  ImportarMovimientosResultDTO,
  MOTIVOS_DEVOLUCION,
  ProyectoAlmacenFiltroDTO,
  TIPOS_MOVIMIENTO_ALMACEN,
  UpdateAlmacenMaterialBody,
} from '../../../../core/dtos/almacen/almacen.model';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { DEFAULT_PAGE_SIZE } from '../../../../shared/constants/pagination';
import { ALMACEN_TABS } from '../../shared/almacen-tabs';

@Component({
  selector: 'app-almacen-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect, BaseModal, FilterTriggerButton, FilterModal, Paginator],
  templateUrl: './almacen-stock.html',
  styleUrl: './almacen-stock.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlmacenStock implements OnInit {
  readonly tabs = ALMACEN_TABS;
  readonly tiposMovimiento = TIPOS_MOVIMIENTO_ALMACEN;
  readonly motivosDevolucion = MOTIVOS_DEVOLUCION;

  importando = false;

  proyectos: ProyectoAlmacenFiltroDTO[] = [];
  materiales: AlmacenMaterialDTO[] = [];
  proyectoId: number | null = null;

  stock: AlmacenStockDTO | null = null;
  movimientos: AlmacenMovimientoListItemDTO[] = [];
  total = 0;
  pagina = 1;
  porPagina = DEFAULT_PAGE_SIZE;

  materialIdFiltro: number | null = null;
  tipoFiltro: string | null = null;
  desde: string | null = null;
  hasta: string | null = null;
  filtrosAbiertos = false;

  showNuevoMovimiento = false;
  showNuevoMaterial = false;
  showGestionMateriales = false;
  guardando = false;

  materialesGestion: AlmacenMaterialDTO[] = [];
  editandoMaterialId: number | null = null;
  editMaterialForm = {
    nombre: '',
    unidadMedida: '',
    puntoReorden: null as number | null,
    stockSeguridad: null as number | null,
    activo: true,
  };

  nuevoMovimiento = {
    proyectoId: null as number | null,
    materialId: null as number | null,
    tipo: 'Ingreso' as string,
    fecha: this.hoyISO(),
    cantidad: null as number | null,
    origen: '',
    motivoDevolucion: null as string | null,
    comentario: '',
  };

  nuevoMaterial = {
    codigo: '',
    nombre: '',
    unidadMedida: '',
    puntoReorden: null as number | null,
    stockSeguridad: null as number | null,
  };

  get filtrosActivos(): number {
    let n = 0;
    if (this.materialIdFiltro) n++;
    if (this.tipoFiltro) n++;
    if (this.desde) n++;
    if (this.hasta) n++;
    return n;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.porPagina));
  }

  constructor(
    private service: AlmacenService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFiltros();
    this.loadStock();
    this.loadMovimientos();
  }

  private hoyISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadFiltros(): void {
    this.service.getFiltros().subscribe({
      next: (data: AlmacenFiltrosDTO) => {
        this.proyectos = [...data.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.materiales = [...data.materiales].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.loadStock();
    this.onFilterChange();
  }

  loadStock(): void {
    this.service.getStock(this.proyectoId).subscribe({
      next: (data) => {
        this.stock = data;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  loadMovimientos(): void {
    this.loaderService.show();
    this.service
      .getMovimientos({
        proyectoId: this.proyectoId,
        materialId: this.materialIdFiltro,
        tipo: this.tipoFiltro,
        desde: this.desde,
        hasta: this.hasta,
        pagina: this.pagina,
        porPagina: this.porPagina,
      })
      .subscribe({
        next: (data) => {
          this.movimientos = data.items;
          this.total = data.total;
          this.loaderService.hide();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  onFilterChange(): void {
    this.pagina = 1;
    this.loadMovimientos();
  }

  limpiarFiltros(): void {
    this.materialIdFiltro = null;
    this.tipoFiltro = null;
    this.desde = null;
    this.hasta = null;
    this.onFilterChange();
  }

  changePage(page: number): void {
    this.pagina = page;
    this.loadMovimientos();
  }

  abrirNuevoMovimiento(): void {
    this.nuevoMovimiento = {
      proyectoId: this.proyectoId,
      materialId: null,
      tipo: 'Ingreso',
      fecha: this.hoyISO(),
      cantidad: null,
      origen: '',
      motivoDevolucion: null,
      comentario: '',
    };
    this.showNuevoMovimiento = true;
  }

  guardarMovimiento(): void {
    const m = this.nuevoMovimiento;
    if (!m.proyectoId || !m.materialId || !m.cantidad || m.cantidad <= 0) {
      Swal.fire({ icon: 'warning', title: 'Completa proyecto, material y una cantidad mayor a 0.' });
      return;
    }
    if (m.tipo === 'Devolucion' && !m.motivoDevolucion) {
      Swal.fire({ icon: 'warning', title: 'Indica el motivo de la devolución (Error o Sobrante).' });
      return;
    }
    this.guardando = true;
    this.service
      .crearMovimiento({
        proyectoId: m.proyectoId,
        materialId: m.materialId,
        fecha: m.fecha,
        tipo: m.tipo,
        cantidad: m.cantidad,
        origen: m.origen || null,
        motivoDevolucion: m.tipo === 'Devolucion' ? m.motivoDevolucion : null,
        comentario: m.comentario || null,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.showNuevoMovimiento = false;
          this.loadStock();
          this.pagina = 1;
          this.loadMovimientos();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.errorService.handleError(err);
        },
      });
  }

  guardarMaterial(): void {
    const m = this.nuevoMaterial;
    if (!m.codigo.trim() || !m.nombre.trim() || !m.unidadMedida.trim()) {
      Swal.fire({ icon: 'warning', title: 'Código, nombre y unidad de medida son obligatorios.' });
      return;
    }
    this.guardando = true;
    this.service
      .crearMaterial({
        codigo: m.codigo.trim(),
        nombre: m.nombre.trim(),
        unidadMedida: m.unidadMedida.trim(),
        puntoReorden: m.puntoReorden,
        stockSeguridad: m.stockSeguridad,
      })
      .subscribe({
      next: () => {
        this.guardando = false;
        this.showNuevoMaterial = false;
        this.nuevoMaterial = { codigo: '', nombre: '', unidadMedida: '', puntoReorden: null, stockSeguridad: null };
        this.loadFiltros();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.errorService.handleError(err);
      },
    });
  }

  onArchivoImportar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    this.importando = true;
    this.service.importarMovimientos(file).subscribe({
      next: (resultado: ImportarMovimientosResultDTO) => {
        this.importando = false;
        this.mostrarResultadoImportacion(resultado);
        this.loadStock();
        this.pagina = 1;
        this.loadMovimientos();
        this.loadFiltros();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.importando = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private mostrarResultadoImportacion(r: ImportarMovimientosResultDTO): void {
    const detalle = [
      `${r.importados} movimiento(s) importado(s) de ${r.totalFilas} fila(s).`,
      r.duplicados > 0 ? `${r.duplicados} fila(s) ya existían y no se contaron dos veces.` : null,
      r.materialesCreados > 0 ? `${r.materialesCreados} material(es) nuevo(s) se agregaron al catálogo.` : null,
    ].filter(Boolean).join(' ');

    const listaErrores = r.errores.length
      ? `<div style="text-align:left;max-height:180px;overflow:auto;margin-top:8px;font-size:12px;color:#b91c1c;">${r.errores.map((e) => `• ${e}`).join('<br>')}</div>`
      : '';

    Swal.fire({
      icon: r.errores.length ? 'warning' : 'success',
      title: 'Importación completada',
      html: `<p>${detalle}</p>${listaErrores}`,
    });
  }

  abrirGestionMateriales(): void {
    this.editandoMaterialId = null;
    this.showGestionMateriales = true;
    this.loadMaterialesGestion();
  }

  loadMaterialesGestion(): void {
    this.service.getMateriales(false).subscribe({
      next: (data) => {
        this.materialesGestion = data;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  iniciarEdicionMaterial(m: AlmacenMaterialDTO): void {
    this.editandoMaterialId = m.id;
    this.editMaterialForm = {
      nombre: m.nombre,
      unidadMedida: m.unidadMedida,
      puntoReorden: m.puntoReorden,
      stockSeguridad: m.stockSeguridad,
      activo: m.activo,
    };
  }

  cancelarEdicionMaterial(): void {
    this.editandoMaterialId = null;
  }

  guardarEdicionMaterial(m: AlmacenMaterialDTO): void {
    if (!this.editMaterialForm.nombre.trim() || !this.editMaterialForm.unidadMedida.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre y unidad de medida son obligatorios.' });
      return;
    }
    const body: UpdateAlmacenMaterialBody = {
      nombre: this.editMaterialForm.nombre.trim(),
      unidadMedida: this.editMaterialForm.unidadMedida.trim(),
      puntoReorden: this.editMaterialForm.puntoReorden,
      stockSeguridad: this.editMaterialForm.stockSeguridad,
      activo: this.editMaterialForm.activo,
    };
    this.service.actualizarMaterial(m.id, body).subscribe({
      next: (actualizado) => {
        Object.assign(m, actualizado);
        this.editandoMaterialId = null;
        this.loadFiltros();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Alterna Activo/Inactivo directo desde el switch, sin pasar por el modo edición completo. */
  toggleActivoMaterial(m: AlmacenMaterialDTO): void {
    const body: UpdateAlmacenMaterialBody = {
      nombre: m.nombre,
      unidadMedida: m.unidadMedida,
      puntoReorden: m.puntoReorden,
      stockSeguridad: m.stockSeguridad,
      activo: !m.activo,
    };
    this.service.actualizarMaterial(m.id, body).subscribe({
      next: (actualizado) => {
        Object.assign(m, actualizado);
        this.loadFiltros();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  trackByMaterialGestion(_: number, m: AlmacenMaterialDTO): number {
    return m.id;
  }

  trackByMaterial(_: number, m: { materialId: number }): number {
    return m.materialId;
  }

  trackByMovimiento(_: number, m: AlmacenMovimientoListItemDTO): number {
    return m.id;
  }
}
