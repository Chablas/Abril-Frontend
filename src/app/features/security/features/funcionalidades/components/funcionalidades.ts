import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SECURITY_TABS } from '../../../shared/security-tabs';
import { SIN_MODULO, displayName } from '../../../shared/utils/feature-display-name';
import { FuncionalidadesService } from '../services/funcionalidades.service';
import { FuncionalidadRow } from '../dtos/funcionalidad.dto';
import { FuncionalidadDetalleModal } from './funcionalidad-detalle-modal/funcionalidad-detalle-modal';

interface ModuloOption {
  moduleId: number;
  nombre: string;
}

/** Valor del filtro para las funcionalidades sin module_id: null ya significa «todos los módulos». */
const SIN_MODULO_ID = -1;

/**
 * Seguridad → Funcionalidades: el catálogo de la tabla `feature`, con cuántos roles y usuarios
 * acceden a cada una; el detalle dice cuáles. Solo lectura — las funcionalidades se dan de alta por
 * base de datos y se asignan a los roles desde Seguridad → Roles.
 *
 * Llegan todas en una sola petición y se filtran y paginan en memoria: son pocas filas y el nombre
 * por el que se busca (el del sidebar) solo existe en el frontend.
 */
@Component({
  selector: 'app-funcionalidades',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    Paginator,
    FuncionalidadDetalleModal,
  ],
  templateUrl: './funcionalidades.html',
  styleUrl: './funcionalidades.css',
})
export class Funcionalidades implements OnInit {
  readonly tabs = SECURITY_TABS;
  readonly filasSkeleton = [1, 2, 3, 4, 5, 6];

  loading = true;
  filtradas: FuncionalidadRow[] = [];
  moduloOptions: ModuloOption[] = [];

  searchText = '';
  moduloFilter: number | null = null;
  filtrosAbiertos = false;

  /** Funcionalidad con el detalle abierto. */
  seleccionada: FuncionalidadRow | null = null;

  private funcionalidades: FuncionalidadRow[] = [];
  private readonly pager = new ClientPager<FuncionalidadRow>();

  constructor(
    private service: FuncionalidadesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.moduloFilter !== null) n++;
    return n;
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filtradas);
  }

  get paginadas(): FuncionalidadRow[] {
    return this.pager.page(this.filtradas);
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.list().subscribe({
      next: (data) => {
        this.funcionalidades = data
          .map((f) => ({ ...f, label: displayName(f.featureKey), moduleLabel: f.moduleName ?? SIN_MODULO }))
          .sort((a, b) => this.compararModulo(a, b) || a.label.localeCompare(b.label, 'es'));
        this.moduloOptions = this.buildModuloOptions();
        this.aplicarFiltros();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.aplicarFiltros();
  }

  onModuloChange(value: number | null): void {
    this.moduloFilter = value;
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.moduloFilter = null;
    this.aplicarFiltros();
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  abrirDetalle(funcionalidad: FuncionalidadRow): void {
    this.seleccionada = funcionalidad;
  }

  trackById(_: number, f: FuncionalidadRow): number {
    return f.featureId;
  }

  private aplicarFiltros(): void {
    const texto = this.searchText.trim();
    this.filtradas = this.funcionalidades.filter((f) => {
      if (this.moduloFilter !== null && (f.moduleId ?? SIN_MODULO_ID) !== this.moduloFilter) return false;
      return !texto || SearchInput.matches(`${f.label} ${f.featureKey} ${f.moduleLabel}`, texto);
    });
    this.pager.reset();
  }

  /** Módulos en orden alfabético y «Sin módulo asignado» siempre al final. */
  private compararModulo(a: FuncionalidadRow, b: FuncionalidadRow): number {
    return (
      Number(a.moduleId === null) - Number(b.moduleId === null) ||
      a.moduleLabel.localeCompare(b.moduleLabel, 'es')
    );
  }

  /** Solo los módulos que tienen alguna funcionalidad, para que ninguna opción deje la tabla vacía. */
  private buildModuloOptions(): ModuloOption[] {
    const porId = new Map<number, string>();
    let haySinModulo = false;
    for (const f of this.funcionalidades) {
      if (f.moduleId === null) haySinModulo = true;
      else porId.set(f.moduleId, f.moduleLabel);
    }

    const opciones = [...porId]
      .map(([moduleId, nombre]) => ({ moduleId, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (haySinModulo) opciones.push({ moduleId: SIN_MODULO_ID, nombre: SIN_MODULO });
    return opciones;
  }
}
