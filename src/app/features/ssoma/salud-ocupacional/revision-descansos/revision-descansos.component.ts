import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';
import { RevisionDescansosService } from './revision-descansos.service';
import { RevisionDescansoDetalleModalComponent } from './revision-descanso-detalle-modal.component';
import {
  RevisionAreaNodoDto,
  RevisionDescansoDetalleDto,
  RevisionDescansoListItemDto,
  RevisionDescansosFiltro,
  RevisionTrabajadorOpcionDto,
} from './revision-descansos.dtos';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

@Component({
  standalone: true,
  selector: 'app-revision-descansos',
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    Paginator,
    SearchSelect,
    StatusBadge,
    FilterTriggerButton,
    FilterModal,
    TitleCasePipe,
    AbrilBulkActionDirective,
    RevisionDescansoDetalleModalComponent,
  ],
  templateUrl: './revision-descansos.component.html',
  styleUrl: './revision-descansos.component.css',
})
export class RevisionDescansosComponent implements OnInit {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize = 20;

  solicitudes: RevisionDescansoListItemDto[] = [];

  trabajadorOptions: RevisionTrabajadorOpcionDto[] = [];
  readonly estadoOptions = [
    { value: null,         label: 'Todas' },
    { value: 'Pendiente',  label: 'Pendientes' },
    { value: 'Aprobado',   label: 'Aprobadas' },
    { value: 'Rechazado',  label: 'Rechazadas' },
    { value: 'Completado', label: 'Completadas' },
  ];

  filters: RevisionDescansosFiltro = {
    workerId: null,
    estado: null,
    fechaDesde: null,
    fechaHasta: null,
  };

  // ── Filtro de área en cascada (igual al de Gestión de Salidas) ──────
  /** Niveles visibles del desplegable en cascada: [0] = raíces, [1] = hijos del nodo elegido, … */
  areaLevels: AreaCascadeNode[][] = [];
  /** Nodo elegido por nivel (undefined = "Todas" en ese nivel). */
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];

  // ── Paginación (server-side) ────────────────────────────────────────
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  // ── Ordenamiento (server-side) ──────────────────────────────────────
  sortBy: string | null = null;
  sortDir: 'asc' | 'desc' | null = null;

  /** IDs seleccionados para acción bulk. */
  selectedIds = new Set<number>();

  /** Detalle abierto en modal (null = modal cerrado). */
  detalle: RevisionDescansoDetalleDto | null = null;

  /** Modal de filtros estándar. */
  filtrosAbiertos = false;

  constructor(
    private service:       RevisionDescansosService,
    private loaderService: LoaderService,
    private errorService:  ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadInit();
  }

  /** Carga inicial: filtros (áreas + trabajadores) + primera página en una sola petición. */
  private loadInit(): void {
    this.loaderService.show();
    this.service.getInit(this.filters).subscribe({
      next: (res) => {
        this.trabajadorOptions = [
          { workerId: null as unknown as number, nombreCompleto: 'Todos los trabajadores' },
          ...res.trabajadores,
        ];
        this.buildAreaCascade(res.areaTree);
        this.applyPage(res.tabla.data, res.tabla.page, res.tabla.totalPages, res.tabla.totalRecords);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  load(page: number = 1): void {
    this.loaderService.show();
    this.service.getList(this.filters, page, this.sortBy, this.sortDir, this.currentAreaScopeIds()).subscribe({
      next: (res) => {
        this.applyPage(res.data, res.page, res.totalPages, res.totalRecords);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private applyPage(data: RevisionDescansoListItemDto[], page: number, totalPages: number, totalRecords: number): void {
    this.solicitudes  = data;
    this.currentPage  = page;
    this.totalPages   = totalPages;
    this.totalRecords = totalRecords;
    this.selectedIds.clear();
    this.lastClickedIndex = null;
  }

  onSearch(): void { this.load(1); }
  onPageChange(page: number): void { this.load(page); }

  // ── Filtros ─────────────────────────────────────────────────────────

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.workerId != null) n++;
    if (this.filters.estado) n++;
    if (this.filters.fechaDesde) n++;
    if (this.filters.fechaHasta) n++;
    if (this.selectedAreaNodes.some((node) => node)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = { workerId: null, estado: null, fechaDesde: null, fechaHasta: null };
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.onSearch();
  }

  // ── Filtro de área en cascada ───────────────────────────────────────

  /** Arma el árbol a partir de la lista plana de nodos area_scope y deja listo el 1er nivel. */
  private buildAreaCascade(nodes: RevisionAreaNodoDto[]): void {
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
  }

  /** area_scope_id del nodo seleccionado más profundo + todos sus descendientes (o null si "Todas"). */
  private currentAreaScopeIds(): number[] | null {
    let deepest: AreaCascadeNode | undefined;
    for (let i = this.selectedAreaNodes.length - 1; i >= 0; i--) {
      if (this.selectedAreaNodes[i]) {
        deepest = this.selectedAreaNodes[i];
        break;
      }
    }
    return deepest ? this.collectScopeIds(deepest) : null;
  }

  private collectScopeIds(node: AreaCascadeNode): number[] {
    const ids = [node.areaScopeId];
    for (const c of node.children) ids.push(...this.collectScopeIds(c));
    return ids;
  }

  // ── Ordenamiento de columnas (server-side) ──────────────────────────

  /** Cicla el orden de una columna: sin orden → ascendente → descendente → orden original. */
  toggleSort(column: string): void {
    if (this.sortBy !== column) {
      this.sortBy = column;
      this.sortDir = 'asc';
    } else if (this.sortDir === 'asc') {
      this.sortDir = 'desc';
    } else {
      this.sortBy = null;
      this.sortDir = null;
    }
    this.load(1);
  }

  /** Dirección de orden activa para una columna (o null si no está ordenada por ella). */
  sortDirOf(column: string): 'asc' | 'desc' | null {
    return this.sortBy === column ? this.sortDir : null;
  }

  // ── Selección de filas (estilo Outlook: click + shift+click rango) ──

  /** Índice de la última fila clickeada (ancla para la selección por rango con Shift). */
  private lastClickedIndex: number | null = null;

  /**
   * Click sobre una fila de la tabla. Con Shift presionado selecciona el registro
   * (o el rango) en vez de abrir el detalle.
   */
  onRowClick(event: MouseEvent, index: number): void {
    if (event.shiftKey) {
      // Evita que Shift+clic resalte texto de la fila.
      if (typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
      this.onSelectClick(event, index);
      return;
    }
    this.abrirDetalle(this.solicitudes[index]);
  }

  /**
   * Maneja el click sobre la casilla de selección de una fila.
   * Con Shift presionado selecciona todo el rango entre la última fila clickeada
   * y la actual (como en Outlook); sin Shift alterna solo esa fila.
   */
  onSelectClick(event: MouseEvent, index: number): void {
    event.stopPropagation();

    if (event.shiftKey && this.lastClickedIndex !== null) {
      const [desde, hasta] = [this.lastClickedIndex, index].sort((a, b) => a - b);
      for (let k = desde; k <= hasta; k++) this.selectedIds.add(this.solicitudes[k].id);
      return; // el ancla se mantiene
    }

    const id = this.solicitudes[index].id;
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else                          this.selectedIds.add(id);
    this.lastClickedIndex = index;
  }

  get allSelected(): boolean {
    return this.solicitudes.length > 0 && this.solicitudes.every((s) => this.selectedIds.has(s.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      this.selectedIds = new Set(this.solicitudes.map((s) => s.id));
    }
    this.lastClickedIndex = null;
  }

  get selectedSolicitudes(): RevisionDescansoListItemDto[] {
    return this.solicitudes.filter((s) => this.selectedIds.has(s.id));
  }

  /** Seleccionadas en estado Pendiente (objetivo de Aprobar / Rechazar). */
  get selectedPendientes(): RevisionDescansoListItemDto[] {
    return this.selectedSolicitudes.filter((s) => s.estado === 'Pendiente');
  }

  // ── Acciones bulk: aprobar / rechazar ───────────────────────────────

  async aprobarBulk(): Promise<void> {
    const ids = this.selectedPendientes.map((s) => s.id);
    if (ids.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${ids.length} solicitud(es)?`,
      text: 'Se aprobarán todas las solicitudes pendientes seleccionadas y los trabajadores quedarán bloqueados en Control de Acceso mientras dure el descanso.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    });
    if (!result.isConfirmed) return;

    this.aprobarIds(ids);
  }

  async rechazarBulk(): Promise<void> {
    const ids = this.selectedPendientes.map((s) => s.id);
    if (ids.length === 0) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: `¿Rechazar ${ids.length} solicitud(es)?`,
      input: 'textarea',
      inputLabel: 'Motivo de rechazo',
      inputPlaceholder: 'Explica por qué se rechazan las solicitudes seleccionadas…',
      inputValidator: (value) => (!value || !value.trim() ? 'El motivo de rechazo es obligatorio.' : null),
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!result.isConfirmed) return;

    this.rechazarIds(ids, String(result.value).trim());
  }

  /** Aprueba por IDs (lo usan la acción bulk y el botón del modal de detalle). */
  aprobarIds(ids: number[]): void {
    this.loaderService.show();
    this.service.aprobar(ids).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.detalle = null;
        Swal.fire({ title: res.message, icon: 'success', timer: 1800, showConfirmButton: false });
        this.load(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Rechaza por IDs con un motivo común (bulk y modal de detalle). */
  rechazarIds(ids: number[], motivo: string): void {
    this.loaderService.show();
    this.service.rechazar(ids, motivo).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.detalle = null;
        Swal.fire({ title: res.message, icon: 'success', timer: 1800, showConfirmButton: false });
        this.load(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Rechazo desde el modal de detalle: pide el motivo y delega en rechazarIds. */
  async rechazarDesdeDetalle(id: number): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Rechazar esta solicitud?',
      input: 'textarea',
      inputLabel: 'Motivo de rechazo',
      inputPlaceholder: 'Explica por qué se rechaza la solicitud…',
      inputValidator: (value) => (!value || !value.trim() ? 'El motivo de rechazo es obligatorio.' : null),
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!result.isConfirmed) return;
    this.rechazarIds([id], String(result.value).trim());
  }

  async aprobarDesdeDetalle(id: number): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Aprobar esta solicitud?',
      text: 'El trabajador quedará bloqueado en Control de Acceso mientras dure el descanso.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    });
    if (!result.isConfirmed) return;
    this.aprobarIds([id]);
  }

  // ── Modal de detalle ────────────────────────────────────────────────

  abrirDetalle(s: RevisionDescansoListItemDto): void {
    this.loaderService.show();
    this.service.getDetalle(s.id).subscribe({
      next: (data) => {
        this.detalle = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  // ── Colores de badges ───────────────────────────────────────────────

  estadoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':   return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado':  return { bg: '#FAD5D4', text: '#D30000' };
      case 'Completado': return { bg: '#DBEAFE', text: '#2563EB' };
      default:           return { bg: '#FEF9C3', text: '#92400E' };
    }
  }
}
