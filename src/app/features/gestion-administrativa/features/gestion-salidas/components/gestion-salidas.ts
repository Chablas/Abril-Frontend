import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { GestionSalidasService } from '../services/gestion-salidas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Roles } from '../../../../../core/constants/roles';
import { FormsModule } from '@angular/forms';
import {
  AreaNodeDto,
  GestionSalidaDetalleDto,
  GestionSalidaListItemDto,
} from '../dtos/gestion-salida.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { GestionSalidaDetalleModal } from './gestion-salida-detalle-modal/gestion-salida-detalle-modal';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

@Component({
  standalone: true,
  selector: 'app-gestion-salidas',
  imports: [CommonModule, FormsModule, StatusBadge, SearchSelect, Paginator, GestionSalidaDetalleModal, AbrilPageHeaderComponent],
  templateUrl: './gestion-salidas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GestionSalidas implements OnInit {
  anioActual = new Date().getFullYear();
  salidas: GestionSalidaListItemDto[] = [];

  trabajadorOptions: any[] = [];
  lugarProyectoOptions: any[] = [];
  readonly estadoRendicionOptions = [
    { value: null,           label: 'Todas' },
    { value: 'No rendido',   label: 'No rendidas' },
    { value: 'Rendido',      label: 'Rendidas' },
  ];
  readonly estadoAprobacionOptions = [
    { value: null,        label: 'Todas' },
    { value: 'Pendiente', label: 'Pendientes' },
    { value: 'Aprobado',  label: 'Aprobadas' },
    { value: 'Rechazado', label: 'Rechazadas' },
  ];

  filters = {
    workerId:          null as number | null,
    lugarProyectoId:   null as number | null,
    estadoRendicion:   null as string | null,
    estadoAprobacion:  null as string | null,
  };

  // ── Filtro de área en cascada (igual al de Visibilidad de Salidas) ──
  /** Niveles visibles del desplegable en cascada: [0] = raíces, [1] = hijos del nodo elegido, … */
  areaLevels: AreaCascadeNode[][] = [];
  /** Nodo elegido por nivel (undefined = "Todas" en ese nivel). */
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];

  // ── Paginación (server-side) ────────────────────────────────────────
  readonly pageSize = 10;
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  // ── Ordenamiento (server-side) ──────────────────────────────────────
  sortBy: string | null = null;
  sortDir: 'asc' | 'desc' | null = null;

  /** IDs seleccionados para acción bulk. */
  selectedIds = new Set<number>();

  /** Detalle abierto en modal (null = modal cerrado). */
  detalle: GestionSalidaDetalleDto | null = null;

  constructor(
    private service:       GestionSalidasService,
    private loaderService: LoaderService,
    private errorService:  ErrorService,
    private authService:   AuthService,
  ) {}

  /** True si el usuario logueado tiene rol "USUARIO DE RECEPCIÓN" — habilita la columna extra. */
  get esRecepcion(): boolean {
    return this.authService.hasRole(Roles.USUARIO_RECEPCION);
  }

  guardarHoraReal(s: GestionSalidaListItemDto, valor: string, ev?: Event): void {
    ev?.stopPropagation();
    // input type="time" devuelve "HH:mm" o "" si está vacío. El backend acepta null para limpiar.
    const hora = valor && valor.trim() !== '' ? valor : null;
    if ((s.horaSalidaReal ?? '').substring(0, 5) === (hora ?? '')) return; // sin cambio

    this.loaderService.show();
    this.service.setHoraSalidaReal(s.id, hora).subscribe({
      next: (res) => {
        s.horaSalidaReal = hora;
        this.loaderService.hide();
        Swal.fire({
          title: res.message,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Devuelve "HH:mm" listo para el input type="time" (el backend devuelve "HH:mm:ss"). */
  horaRealInput(s: GestionSalidaListItemDto): string {
    return s.horaSalidaReal ? s.horaSalidaReal.substring(0, 5) : '';
  }

  ngOnInit(): void {
    this.loadFilterData();
    this.load();
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.trabajadorOptions = [
          { workerId: null, nombreCompleto: 'Todos los trabajadores' },
          ...data.trabajadores,
        ];
        this.lugarProyectoOptions = [
          { gaLugarId: null, nombreDisplay: 'Todos los proyectos' },
          ...data.lugaresProyecto,
        ];
        this.buildAreaCascade(data.areaTree);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Filtro de área en cascada ────────────────────────────────────────────

  /** Arma el árbol a partir de la lista plana de nodos area_scope y deja listo el 1er nivel. */
  private buildAreaCascade(nodes: AreaNodeDto[]): void {
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

  load(page: number = 1): void {
    this.loaderService.show();
    this.selectedIds.clear();
    this.lastClickedIndex = null;
    this.service.getAll(
      this.filters.workerId,
      this.filters.lugarProyectoId,
      this.filters.estadoRendicion,
      this.filters.estadoAprobacion,
      page,
      this.sortBy,
      this.sortDir,
      this.currentAreaScopeIds(),
    ).subscribe({
      next: (res) => {
        this.salidas      = res.data;
        this.currentPage  = res.page;
        this.totalPages   = res.totalPages;
        this.totalRecords = res.totalRecords;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearch(): void {
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  // ── Ordenamiento de columnas (server-side) ──────────────────────────
  /**
   * Cicla el orden de una columna: sin orden → ascendente → descendente → orden original.
   * El orden se aplica en el servidor sobre todos los registros (no solo la página visible).
   */
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

  exportarExcel(): void {
    this.loaderService.show();
    this.service.downloadExcel(
      this.filters.workerId,
      this.filters.lugarProyectoId,
      this.filters.estadoRendicion,
      this.filters.estadoAprobacion,
      this.currentAreaScopeIds(),
    ).subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'Gestion_Salidas.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Acciones bulk: aprobar / rechazar ────────────────────────────────
  /** Aprueba en bloque las solicitudes seleccionadas que estén en estado Pendiente. */
  async aprobarBulk(): Promise<void> {
    const items = this.selectedPendientes;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${items.length} solicitud(es)?`,
      text: 'Se aprobarán todas las solicitudes pendientes seleccionadas.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    forkJoin(items.map((s) => this.service.aprobar(s.id))).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: `${items.length} solicitud(es) aprobada(s)`, icon: 'success', timer: 1500, showConfirmButton: false });
        this.load(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Rechaza en bloque las solicitudes seleccionadas que estén en estado Pendiente. */
  async rechazarBulk(): Promise<void> {
    const items = this.selectedPendientes;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: `¿Rechazar ${items.length} solicitud(es)?`,
      text: 'Se rechazarán todas las solicitudes pendientes seleccionadas.',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    forkJoin(items.map((s) => this.service.rechazar(s.id))).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: `${items.length} solicitud(es) rechazada(s)`, icon: 'success', timer: 1500, showConfirmButton: false });
        this.load(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Selección de filas (estilo Outlook: click + shift+click rango) ────

  /** Índice de la última fila clickeada (ancla para la selección por rango con Shift). */
  private lastClickedIndex: number | null = null;

  /** Solo se pueden rendir Aprobadas + No rendidas + con TODOS los trayectos teniendo capturas. */
  esSeleccionable(s: GestionSalidaListItemDto): boolean {
    return s.estadoAprobacion === 'Aprobado'
      && s.estadoRendicion === 'No rendido'
      && s.puedeRendirse;
  }

  /**
   * Click sobre una fila de la tabla. Con Shift presionado selecciona el registro
   * (o el rango, como en la casilla) en vez de abrir el detalle.
   */
  onRowClick(event: MouseEvent, index: number): void {
    if (event.shiftKey) {
      // Evita que Shift+clic resalte texto de la fila.
      if (typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
      this.onSelectClick(event, index);
      return;
    }
    this.abrirDetalle(this.salidas[index]);
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
      for (let k = desde; k <= hasta; k++) this.selectedIds.add(this.salidas[k].id);
      return; // el ancla se mantiene
    }

    const id = this.salidas[index].id;
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else                          this.selectedIds.add(id);
    this.lastClickedIndex = index;
  }

  get allSelected(): boolean {
    return this.salidas.length > 0 && this.salidas.every((s) => this.selectedIds.has(s.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      this.selectedIds = new Set(this.salidas.map((s) => s.id));
    }
    this.lastClickedIndex = null;
  }

  // ── Subconjuntos válidos de la selección por acción ──────────────────
  get selectedSalidas(): GestionSalidaListItemDto[] {
    return this.salidas.filter((s) => this.selectedIds.has(s.id));
  }

  /** Seleccionadas en estado Pendiente (aplican a Aprobar / Rechazar). */
  get selectedPendientes(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter((s) => s.estadoAprobacion === 'Pendiente');
  }

  /** Seleccionadas que pueden rendirse (aplican a Marcar como rendidas). */
  get selectedRendibles(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter((s) => this.esSeleccionable(s));
  }

  async marcarRendidasBulk(): Promise<void> {
    const ids = this.selectedRendibles.map((s) => s.id);
    if (ids.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Marcar ${ids.length} solicitud(es) como rendidas?`,
      text: 'Esto indica que ya fueron rendidas en el sistema S10.',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como rendidas',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0086A5',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.marcarRendidasBulk(ids).subscribe({
      next: (response) => {
        // Disparar descarga del Excel devuelto
        const blob = response.body as Blob;
        const count = Number(response.headers.get('X-Rendidas-Count') ?? ids.length);
        const filename = this.extractFilename(response.headers.get('Content-Disposition'))
                      ?? `Planilla_Rendicion_${new Date().toISOString().slice(0, 10)}.pdf`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        this.loaderService.hide();
        Swal.fire({
          title: `${count} solicitud(es) marcada(s) como rendida(s)`,
          text: 'Se descargó la planilla de gasto por movilidad.',
          icon: 'success',
        });
        this.load(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    // Soporta filename="..." y filename*=UTF-8''...
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ── Modal de detalle ────────────────────────────────────────────────

  abrirDetalle(s: GestionSalidaListItemDto): void {
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

  // ── Colores de badges ────────────────────────────────────────────────

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      default:          return { bg: '#FEF9C3', text: '#92400E' };
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }
}
