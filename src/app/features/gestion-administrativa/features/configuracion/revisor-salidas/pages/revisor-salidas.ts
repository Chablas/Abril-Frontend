import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RevisorSalidasService } from '../services/revisor-salidas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  RevisorAreaNodeDTO,
  WorkerRevisorAsignadoDTO,
  WorkerRevisorSalidaItemDTO,
  WorkerRevisorSalidaOptionDTO,
} from '../dtos/workerRevisorSalida.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { DEFAULT_PAGE_SIZE } from '../../../../../../shared/constants/pagination';
import { RevisorSalidaDetalle } from '../components/detalle/detalle';
import { RevisorSalidaEditar } from '../components/editar/editar';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

@Component({
  standalone: true,
  selector: 'app-revisor-salidas',
  imports: [
    CommonModule,
    SearchSelect,
    SearchInput,
    Paginator,
    TitleCasePipe,
    AbrilBulkActionDirective,
    FilterModal,
    RevisorSalidaDetalle,
    RevisorSalidaEditar,
  ],
  templateUrl: './revisor-salidas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class RevisorSalidas implements OnInit {
  rows: WorkerRevisorSalidaItemDTO[] = [];
  options: WorkerRevisorSalidaOptionDTO[] = [];

  searchText = '';
  /** Filtro por revisor asignado: workerId del revisor o null = todos. */
  revisorFilter: number | null = null;
  /** Filtro por categoría del trabajador: workersCategoryId o null = todas. */
  categoriaTrabajadorFilter: number | null = null;

  filtrosAbiertos = false;

  currentPage = 1;
  readonly pageSize = DEFAULT_PAGE_SIZE;

  /** Trabajador con el modal de detalle abierto. null = cerrado. */
  detalleDe: WorkerRevisorSalidaItemDTO | null = null;
  /** Trabajador con el modal de edición abierto. null = cerrado. */
  editando: WorkerRevisorSalidaItemDTO | null = null;

  // ── Filtro de área en cascada (mismo patrón que Visibilidad de Salidas) ──
  /** Niveles visibles del desplegable en cascada: [0] = raíces, [1] = hijos del nodo elegido, … */
  areaLevels: AreaCascadeNode[][] = [];
  /** Nodo elegido por nivel (undefined = "Todas" en ese nivel). */
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];
  /** area_scope_id del subárbol del nodo seleccionado, aplicados a la tabla. */
  private appliedAreaScopeIds = new Set<number>();

  constructor(
    private service: RevisorSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getInitialData().subscribe({
      next: (data) => {
        this.rows = data.workers;
        this.options = data.options;
        this.buildAreaCascade(data.areaTree);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Modales ───────────────────────────────────────────────────────────

  openDetalle(item: WorkerRevisorSalidaItemDTO): void {
    this.detalleDe = item;
  }

  openEdit(item: WorkerRevisorSalidaItemDTO): void {
    this.editando = item;
  }

  onSaved(): void {
    // Recargar para refrescar los revisores del trabajador editado.
    this.load();
  }

  // ── Celda "Revisores" ─────────────────────────────────────────────────

  /** Revisores ordenados por prioridad. */
  revisoresOrdenados(item: WorkerRevisorSalidaItemDTO): WorkerRevisorAsignadoDTO[] {
    return [...(item.revisores ?? [])].sort((a, b) => a.ordenPrioridad - b.ordenPrioridad);
  }

  /** Primer revisor activo (el que recibe las solicitudes hoy). */
  revisorPrincipal(item: WorkerRevisorSalidaItemDTO): WorkerRevisorAsignadoDTO | undefined {
    return this.revisoresOrdenados(item).find((r) => r.active);
  }

  // ── Filtro de área en cascada ─────────────────────────────────────────

  /** Arma el árbol a partir de la lista plana de nodos area_scope y deja listo el 1er nivel. */
  private buildAreaCascade(nodes: RevisorAreaNodeDTO[]): void {
    const byId = new Map<number, AreaCascadeNode>();
    for (const n of nodes) {
      byId.set(n.areaScopeId, { areaScopeId: n.areaScopeId, name: n.areaItemName, children: [] });
    }
    const roots: AreaCascadeNode[] = [];
    const sorted = [...nodes].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.areaItemName.localeCompare(b.areaItemName),
    );
    for (const n of sorted) {
      const node = byId.get(n.areaScopeId)!;
      const parent = n.areaScopeParentId != null ? byId.get(n.areaScopeParentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    this.areaLevels = roots.length ? [roots] : [];
    this.selectedAreaNodes = roots.length ? [undefined] : [];
  }

  /** Al elegir un nodo: recorta los niveles inferiores y, si tiene hijos, agrega el siguiente desplegable. */
  onAreaNodeChange(levelIndex: number, selectedId: number | undefined): void {
    const selected =
      selectedId != null ? this.areaLevels[levelIndex]?.find((n) => n.areaScopeId === selectedId) : undefined;

    this.selectedAreaNodes[levelIndex] = selected;
    this.areaLevels = this.areaLevels.slice(0, levelIndex + 1);
    this.selectedAreaNodes = this.selectedAreaNodes.slice(0, levelIndex + 1);

    if (selected?.children?.length) {
      this.areaLevels.push(selected.children);
      this.selectedAreaNodes.push(undefined);
    }

    this.appliedAreaScopeIds = new Set(this.currentAreaScopeIds());
    this.onFilterChange();
  }

  /** area_scope_id del nodo seleccionado más profundo + todos sus descendientes. */
  private currentAreaScopeIds(): number[] {
    let deepest: AreaCascadeNode | undefined;
    for (let i = this.selectedAreaNodes.length - 1; i >= 0; i--) {
      if (this.selectedAreaNodes[i]) {
        deepest = this.selectedAreaNodes[i];
        break;
      }
    }
    return deepest ? this.collectScopeIds(deepest) : [];
  }

  private collectScopeIds(node: AreaCascadeNode): number[] {
    const ids = [node.areaScopeId];
    for (const c of node.children) ids.push(...this.collectScopeIds(c));
    return ids;
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  get filteredRows(): WorkerRevisorSalidaItemDTO[] {
    return this.rows.filter((r) => {
      const matchesName =
        !this.searchText.trim() ||
        SearchInput.matches(r.fullName ?? '', this.searchText) ||
        (r.revisores ?? []).some((rev) => SearchInput.matches(rev.revisorFullName ?? '', this.searchText));
      const matchesRevisor =
        this.revisorFilter == null ||
        (r.revisores ?? []).some((rev) => rev.revisorWorkerId === this.revisorFilter);
      const matchesCategoriaTrabajador =
        this.categoriaTrabajadorFilter == null || r.categoryId === this.categoriaTrabajadorFilter;
      const matchesArea =
        this.appliedAreaScopeIds.size === 0 ||
        (r.areaScopeId != null && this.appliedAreaScopeIds.has(r.areaScopeId));
      return matchesName && matchesRevisor && matchesCategoriaTrabajador && matchesArea;
    });
  }

  /** Categorías de los trabajadores listados (opciones del filtro). */
  get categoriaTrabajadorFilterOptions(): { id: number; name: string }[] {
    const seen = new Map<number, string>();
    for (const r of this.rows) {
      if (r.categoryId != null && r.category && !seen.has(r.categoryId)) {
        seen.set(r.categoryId, r.category);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Revisores que aparecen asignados en la lista (opciones del filtro). */
  get revisorFilterOptions(): WorkerRevisorSalidaOptionDTO[] {
    const seen = new Map<number, WorkerRevisorSalidaOptionDTO>();
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
    if (this.categoriaTrabajadorFilter !== null) n++;
    if (this.selectedAreaNodes.some((x) => x)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.revisorFilter = null;
    this.categoriaTrabajadorFilter = null;
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.appliedAreaScopeIds = new Set();
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pagedRows(): WorkerRevisorSalidaItemDTO[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.filteredRows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  changePage(page: number): void {
    this.currentPage = page;
  }
}
