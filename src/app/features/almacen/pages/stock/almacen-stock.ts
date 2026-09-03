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
  ProyectoAlmacenFiltroDTO,
  TIPOS_MOVIMIENTO_ALMACEN,
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
  guardando = false;

  nuevoMovimiento = {
    proyectoId: null as number | null,
    materialId: null as number | null,
    tipo: 'Ingreso' as string,
    fecha: this.hoyISO(),
    cantidad: null as number | null,
    origen: '',
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
    this.guardando = true;
    this.service
      .crearMovimiento({
        proyectoId: m.proyectoId,
        materialId: m.materialId,
        fecha: m.fecha,
        tipo: m.tipo,
        cantidad: m.cantidad,
        origen: m.origen || null,
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

  trackByMaterial(_: number, m: { materialId: number }): number {
    return m.materialId;
  }

  trackByMovimiento(_: number, m: AlmacenMovimientoListItemDTO): number {
    return m.id;
  }
}
