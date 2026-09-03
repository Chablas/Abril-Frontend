import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AlmacenService } from '../../../../core/services/almacen/almacen.service';
import { OrdenesCompraService } from '../../../../core/services/almacen/ordenes-compra.service';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import {
  AlmacenOrdenCompraListItemDTO,
  ProyectoAlmacenFiltroDTO,
  TIPOS_DOCUMENTO_OC,
} from '../../../../core/dtos/almacen/almacen.model';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { DEFAULT_PAGE_SIZE } from '../../../../shared/constants/pagination';
import { ALMACEN_TABS } from '../../shared/almacen-tabs';

@Component({
  selector: 'app-almacen-ordenes-compra',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    SearchSelect,
    BaseModal,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    Paginator,
  ],
  templateUrl: './almacen-ordenes-compra.html',
  styleUrl: './almacen-ordenes-compra.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlmacenOrdenesCompra implements OnInit {
  readonly tabs = ALMACEN_TABS;
  readonly tipos = TIPOS_DOCUMENTO_OC;

  proyectos: ProyectoAlmacenFiltroDTO[] = [];
  items: AlmacenOrdenCompraListItemDTO[] = [];
  total = 0;
  pagina = 1;
  porPagina = DEFAULT_PAGE_SIZE;

  proyectoId: number | null = null;
  tipoFiltro: string | null = null;
  searchText = '';
  filtrosAbiertos = false;

  showNuevo = false;
  guardando = false;
  archivoSeleccionado: File | null = null;

  nuevo = {
    proyectoId: null as number | null,
    numero: '',
    tipo: 'Orden de Compra' as string,
    proveedor: '',
    monto: null as number | null,
    moneda: 'PEN',
    fecha: new Date().toISOString().slice(0, 10),
  };

  get filtrosActivos(): number {
    let n = 0;
    if (this.tipoFiltro) n++;
    if (this.searchText.trim()) n++;
    return n;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.porPagina));
  }

  constructor(
    private almacenService: AlmacenService,
    private service: OrdenesCompraService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFiltros();
    this.load();
  }

  loadFiltros(): void {
    this.almacenService.getFiltros().subscribe({
      next: (data) => {
        this.proyectos = [...data.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.onFilterChange();
  }

  load(): void {
    this.loaderService.show();
    this.service
      .getOrdenesCompra({
        proyectoId: this.proyectoId,
        tipo: this.tipoFiltro,
        search: this.searchText || null,
        pagina: this.pagina,
        porPagina: this.porPagina,
      })
      .subscribe({
        next: (data) => {
          this.items = data.items;
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
    this.load();
  }

  limpiarFiltros(): void {
    this.tipoFiltro = null;
    this.searchText = '';
    this.onFilterChange();
  }

  changePage(page: number): void {
    this.pagina = page;
    this.load();
  }

  abrirNuevo(): void {
    this.archivoSeleccionado = null;
    this.nuevo = {
      proyectoId: this.proyectoId,
      numero: '',
      tipo: 'Orden de Compra',
      proveedor: '',
      monto: null,
      moneda: 'PEN',
      fecha: new Date().toISOString().slice(0, 10),
    };
    this.showNuevo = true;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado = input.files?.[0] ?? null;
  }

  guardar(): void {
    const n = this.nuevo;
    if (!n.proyectoId || !n.numero.trim() || !n.proveedor.trim() || !n.monto || n.monto <= 0) {
      Swal.fire({ icon: 'warning', title: 'Completa proyecto, número, proveedor y un monto mayor a 0.' });
      return;
    }
    if (!this.archivoSeleccionado) {
      Swal.fire({ icon: 'warning', title: 'Debes adjuntar el archivo de la orden de compra o contrato.' });
      return;
    }

    this.guardando = true;
    this.service
      .crearOrdenCompra(
        {
          proyectoId: n.proyectoId,
          numero: n.numero.trim(),
          tipo: n.tipo,
          proveedor: n.proveedor.trim(),
          monto: n.monto,
          moneda: n.moneda,
          fecha: n.fecha,
        },
        this.archivoSeleccionado,
      )
      .subscribe({
        next: () => {
          this.guardando = false;
          this.showNuevo = false;
          this.pagina = 1;
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.errorService.handleError(err);
        },
      });
  }

  verArchivo(item: AlmacenOrdenCompraListItemDTO): void {
    window.open(this.service.archivoUrlCompleta(item.archivoUrl), '_blank');
  }

  trackById(_: number, o: AlmacenOrdenCompraListItemDTO): number {
    return o.id;
  }
}
