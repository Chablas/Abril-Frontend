import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RevisoresAreasService } from '../services/revisores-areas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import {
  AreaRevisorAsignadoDTO,
  AreaRevisorItemDTO,
  AreaRevisorOptionDTO,
} from '../dtos/areaRevisor.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { DEFAULT_PAGE_SIZE } from '../../../../../../shared/constants/pagination';
import { RevisoresAreasDetalle } from '../components/detalle/detalle';
import { RevisoresAreasEditar } from '../components/editar/editar';

@Component({
  standalone: true,
  selector: 'app-revisores-areas',
  imports: [
    CommonModule,
    SearchSelect,
    SearchInput,
    Paginator,
    TitleCasePipe,
    AbrilBulkActionDirective,
    FilterModal,
    RevisoresAreasDetalle,
    RevisoresAreasEditar,
  ],
  templateUrl: './revisores-areas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class RevisoresAreas implements OnInit {
  rows: AreaRevisorItemDTO[] = [];
  options: AreaRevisorOptionDTO[] = [];

  searchText = '';
  /** Filtro por revisor asignado: workerId del revisor o null = todos. */
  revisorFilter: number | null = null;
  /** Filtro por área padre (gerencia): nombre del padre o null = todas. */
  parentFilter: string | null = null;

  filtrosAbiertos = false;

  currentPage = 1;
  readonly pageSize = DEFAULT_PAGE_SIZE;

  /** Área con el modal de detalle abierto. null = cerrado. */
  detalleDe: AreaRevisorItemDTO | null = null;
  /** Área con el modal de edición abierto. null = cerrado. */
  editando: AreaRevisorItemDTO | null = null;

  /**
   * Solo el ADMINISTRADOR DE SOLICITUD DE SALIDAS ve todas las áreas y puede
   * editar revisores. Los Jefe/Coordinador/Gerente solo ven su área (el
   * backend filtra) y el resto no ve ninguna.
   */
  readonly esAdminSalidas: boolean;

  constructor(
    private service: RevisoresAreasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    authService: AuthService,
  ) {
    this.esAdminSalidas = authService.hasRole(Roles.ADMINISTRADOR_SOLICITUD_SALIDAS);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getInitialData().subscribe({
      next: (data) => {
        this.rows = data.areas;
        this.options = data.options;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Modales ───────────────────────────────────────────────────────────

  openDetalle(item: AreaRevisorItemDTO): void {
    this.detalleDe = item;
  }

  openEdit(item: AreaRevisorItemDTO): void {
    this.editando = item;
  }

  onSaved(): void {
    // Recargar para refrescar los revisores del área editada.
    this.load();
  }

  // ── Celda "Revisores" ─────────────────────────────────────────────────

  /** Revisores ordenados por prioridad. */
  revisoresOrdenados(item: AreaRevisorItemDTO): AreaRevisorAsignadoDTO[] {
    return [...(item.revisores ?? [])].sort((a, b) => a.ordenPrioridad - b.ordenPrioridad);
  }

  /** Primer revisor activo (el que recibe las solicitudes hoy). */
  revisorPrincipal(item: AreaRevisorItemDTO): AreaRevisorAsignadoDTO | undefined {
    return this.revisoresOrdenados(item).find((r) => r.active);
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  get filteredRows(): AreaRevisorItemDTO[] {
    return this.rows.filter((r) => {
      const matchesName =
        !this.searchText.trim() ||
        SearchInput.matches(r.areaName ?? '', this.searchText) ||
        (r.revisores ?? []).some((rev) => SearchInput.matches(rev.revisorFullName ?? '', this.searchText));
      const matchesRevisor =
        this.revisorFilter == null ||
        (r.revisores ?? []).some((rev) => rev.revisorWorkerId === this.revisorFilter);
      const matchesParent = this.parentFilter == null || r.parentName === this.parentFilter;
      return matchesName && matchesRevisor && matchesParent;
    });
  }

  /** Áreas padre (gerencias) de las áreas listadas (opciones del filtro). */
  get parentFilterOptions(): { name: string }[] {
    const seen = new Set<string>();
    for (const r of this.rows) {
      if (r.parentName) seen.add(r.parentName);
    }
    return [...seen].sort((a, b) => a.localeCompare(b)).map((name) => ({ name }));
  }

  /** Revisores que aparecen asignados en la lista (opciones del filtro). */
  get revisorFilterOptions(): AreaRevisorOptionDTO[] {
    const seen = new Map<number, AreaRevisorOptionDTO>();
    for (const r of this.rows) {
      for (const rev of r.revisores ?? []) {
        if (!seen.has(rev.revisorWorkerId)) {
          seen.set(rev.revisorWorkerId, {
            workerId: rev.revisorWorkerId,
            fullName: rev.revisorFullName,
            email: rev.revisorEmail,
          });
        }
      }
    }
    return [...seen.values()].sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.revisorFilter !== null) n++;
    if (this.parentFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.revisorFilter = null;
    this.parentFilter = null;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pagedRows(): AreaRevisorItemDTO[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.filteredRows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  changePage(page: number): void {
    this.currentPage = page;
  }
}
