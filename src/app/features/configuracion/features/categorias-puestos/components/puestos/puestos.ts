import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CategoriasPuestosService } from '../../services/categorias-puestos.service';
import { CategoriaAdminDto, PuestoAdminDto } from '../../dtos/categorias-puestos.dto';
import { PuestoCreateEdit } from '../puesto-create-edit/puesto-create-edit';

/**
 * Sección "Puestos" de Configuración → Categorías y Puestos. Los datos los carga y
 * refresca el contenedor (una sola petición para ambas secciones); acá viven los
 * filtros, la paginación y los modales propios de la sección.
 */
@Component({
  standalone: true,
  selector: 'app-config-puestos',
  imports: [
    CommonModule,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
    Paginator,
    FilterModal,
    SearchInput,
    SearchSelect,
    PuestoCreateEdit,
  ],
  templateUrl: './puestos.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class ConfigPuestos {
  @Input() puestos: PuestoAdminDto[] = [];
  /** Categorías del catálogo: alimentan el selector del modal y el filtro por categoría. */
  @Input() categorias: CategoriaAdminDto[] = [];
  /** Pide al contenedor recargar el catálogo tras crear/editar/activar. */
  @Output() changed = new EventEmitter<void>();

  showModal = false;
  puestoToEdit: PuestoAdminDto | null = null;

  searchText = '';
  categoriaFilter: number | null = null;
  estadoFilter: boolean | null = null;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<PuestoAdminDto>();

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  // ── Filtros ───────────────────────────────────────────────────────────

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.categoriaFilter !== null) n++;
    if (this.estadoFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.categoriaFilter = null;
    this.estadoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredPuestos(): PuestoAdminDto[] {
    return this.puestos.filter((p) => {
      const matchesTexto =
        !this.searchText.trim() ||
        SearchInput.matches(p.nombre ?? '', this.searchText) ||
        SearchInput.matches(p.categoriaNombre ?? '', this.searchText);
      const matchesCategoria =
        this.categoriaFilter === null || p.categoriaId === this.categoriaFilter;
      const matchesEstado = this.estadoFilter === null || p.activo === this.estadoFilter;
      return matchesTexto && matchesCategoria && matchesEstado;
    });
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredPuestos);
  }

  get pagedPuestos(): PuestoAdminDto[] {
    return this.pager.page(this.filteredPuestos);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  /** Abre el modal de creación (lo invoca el botón del header del contenedor). */
  openCreate(): void {
    this.puestoToEdit = null;
    this.showModal = true;
  }

  openEdit(puesto: PuestoAdminDto): void {
    this.puestoToEdit = puesto;
    this.showModal = true;
  }

  closeModales(): void {
    this.showModal = false;
    this.puestoToEdit = null;
  }

  onSaved(): void {
    this.changed.emit();
  }

  toggle(puesto: PuestoAdminDto): void {
    this.loaderService.show();
    this.service.togglePuesto(puesto.id, !puesto.activo).subscribe({
      next: () => {
        this.loaderService.hide();
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
