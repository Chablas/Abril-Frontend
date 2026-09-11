import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AsignacionesAreasService } from './services/asignaciones-areas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Roles } from '../../../../../core/constants/roles';
import {
  AreaAsignacionItemDTO,
  AreaAsignadoDTO,
  AreaEfectivoDTO,
  AreaEfectivoOrigen,
  AreaProyectoAsignacionesDTO,
  AreaWorkerOptionDTO,
  AsignacionAreaModo,
} from './dtos/asignacion-area.dto';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { DEFAULT_PAGE_SIZE } from '../../../../../shared/constants/pagination';
import { AsignacionesAreasDetalle } from './components/detalle/detalle';
import { AsignacionesAreasEditar } from './components/editar/editar';

/** Lo que cambia de un modo a otro. El resto de la pantalla es idéntico. */
interface ModoDef {
  /** "Revisor" / "Consolidador". */
  singular: string;
  /** "Revisores" / "Consolidadores". */
  plural: string;
  /** Encabezado de la columna de vigentes. */
  columnaEfectivos: string;
  /**
   * true = de los asignados solo cuenta el primero activo (revisores). false = cuentan todos
   * (consolidadores). Es la única regla que difiere, y define cómo se lee la columna.
   */
  ganaSoloUno: boolean;
}

/**
 * Sección que asigna personas a áreas: Revisores (quién aprueba las salidas de un área) y
 * Consolidadores (quién puede adjuntar el Consolidado del S10 por los trabajadores de un área).
 *
 * Es un solo componente porque es la misma pantalla sobre la misma estructura: las mismas áreas,
 * el mismo "filtrar por proyecto", el mismo modal de n personas por prioridad y el mismo algoritmo
 * que deduce a quién le toca cuando nadie cargó nada (el Jefe del área, el Gerente de la gerencia,
 * el residente de la obra). Lo único que cambia es cuántos quedan vigentes.
 */
@Component({
  standalone: true,
  selector: 'app-ga-asignaciones-areas',
  imports: [
    CommonModule,
    SearchSelect,
    SearchInput,
    Paginator,
    TitleCasePipe,
    AbrilBulkActionDirective,
    FilterModal,
    AsignacionesAreasDetalle,
    AsignacionesAreasEditar,
  ],
  templateUrl: './asignaciones-areas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaAsignacionesAreas implements OnInit, OnChanges {
  @Input({ required: true }) modo!: AsignacionAreaModo;

  private static readonly MODOS: Record<AsignacionAreaModo, ModoDef> = {
    revisores: {
      singular: 'Revisor',
      plural: 'Revisores',
      columnaEfectivos: 'Revisor vigente',
      ganaSoloUno: true,
    },
    consolidadores: {
      singular: 'Consolidador',
      plural: 'Consolidadores',
      columnaEfectivos: 'Consolidadores vigentes',
      ganaSoloUno: false,
    },
  };

  /** area_type.area_type_name de las filas que son gerencia (raíz de su rama). */
  private readonly TIPO_GERENCIA = 'Área de Gerencia';

  rows: AreaAsignacionItemDTO[] = [];
  options: AreaWorkerOptionDTO[] = [];
  searchText = '';
  /** Filtro por persona: workerId o null = todas. */
  personaFilter: number | null = null;
  /** Filtro por área padre (gerencia): nombre del padre o null = todas. */
  parentFilter: string | null = null;

  filtrosAbiertos = false;

  currentPage = 1;
  readonly pageSize = DEFAULT_PAGE_SIZE;

  /** Área con el modal de detalle abierto. null = cerrado. */
  detalleDe: AreaAsignacionItemDTO | null = null;
  /** Área con el modal de edición abierto. null = cerrado. */
  editando: AreaAsignacionItemDTO | null = null;
  /** Contexto de proyecto de los modales (null = alcance de área). */
  scopeProjectId: number | null = null;
  scopeProjectName: string | undefined;
  scopeAsignados: AreaAsignadoDTO[] | undefined;

  /**
   * Quién configura esta pantalla: el ADMINISTRADOR DE SOLICITUD DE SALIDAS y el USUARIO DE GTH.
   * Ambos ven todas las áreas y pueden editarlas — ver y editar van juntos, igual que en el
   * backend. Los Jefe/Coordinador/Gerente solo ven su área, de lectura, y el resto no ve ninguna.
   */
  readonly puedeGestionar: boolean;

  constructor(
    private service: AsignacionesAreasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    authService: AuthService,
  ) {
    this.puedeGestionar =
      authService.hasRole(Roles.ADMINISTRADOR_SOLICITUD_SALIDAS) ||
      authService.hasRole(Roles.USUARIO_GTH);
  }

  ngOnInit(): void {
    this.load();
  }

  /** El contenedor reusa la instancia entre secciones, así que el modo puede cambiar. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modo'] && !changes['modo'].firstChange) {
      this.closeModales();
      this.limpiarFiltros();
      this.load();
    }
  }

  private get def(): ModoDef {
    return GaAsignacionesAreas.MODOS[this.modo];
  }

  get singular(): string {
    return this.def.singular;
  }

  get plural(): string {
    return this.def.plural;
  }

  get columnaEfectivos(): string {
    return this.def.columnaEfectivos;
  }

  get ganaSoloUno(): boolean {
    return this.def.ganaSoloUno;
  }

  load(): void {
    this.loaderService.show();
    this.service.getInitialData(this.modo).subscribe({
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

  openDetalle(item: AreaAsignacionItemDTO): void {
    this.clearScope();
    this.detalleDe = item;
  }

  openEdit(item: AreaAsignacionItemDTO): void {
    this.clearScope();
    this.editando = item;
  }

  /** Abre el detalle de un proyecto dentro de un área filtrada por proyecto. */
  openDetalleProyecto(item: AreaAsignacionItemDTO, proj: AreaProyectoAsignacionesDTO): void {
    this.scopeProjectId = proj.projectId;
    this.scopeProjectName = proj.projectName;
    this.scopeAsignados = proj.asignados;
    this.detalleDe = item;
  }

  /** Abre la edición de un proyecto dentro de un área filtrada por proyecto. */
  openEditProyecto(item: AreaAsignacionItemDTO, proj: AreaProyectoAsignacionesDTO): void {
    this.scopeProjectId = proj.projectId;
    this.scopeProjectName = proj.projectName;
    this.scopeAsignados = proj.asignados;
    this.editando = item;
  }

  private clearScope(): void {
    this.scopeProjectId = null;
    this.scopeProjectName = undefined;
    this.scopeAsignados = undefined;
  }

  closeModales(): void {
    this.detalleDe = null;
    this.editando = null;
    this.clearScope();
  }

  onSaved(): void {
    // Recargar para refrescar lo asignado y los vigentes del área editada.
    this.load();
  }

  // ── Filtrar por proyecto ──────────────────────────────────────────────

  toggleFiltroProyecto(item: AreaAsignacionItemDTO): void {
    const nuevo = !item.filtraPorProyecto;
    this.loaderService.show();
    this.service.setFiltroProyecto(this.modo, item.areaScopeId, { filtraPorProyecto: nuevo }).subscribe({
      next: () => {
        item.filtraPorProyecto = nuevo;
        // Recargar y no solo marcar la casilla: las subfilas por proyecto las arma el backend
        // (una por proyecto activo, con lo suyo ya resuelto). `load()` cierra el loader.
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Subfilas de proyecto de un área filtrada, tal como las manda el backend. */
  proyectosDeArea(item: AreaAsignacionItemDTO): AreaProyectoAsignacionesDTO[] {
    return item.proyectos ?? [];
  }

  /** true si la fila es un "Área de Gerencia": sus asignados respaldan a toda su rama. */
  esGerencia(item: AreaAsignacionItemDTO): boolean {
    return item.areaTypeName === this.TIPO_GERENCIA;
  }

  // ── Celda de vigentes ─────────────────────────────────────────────────

  /** El primero de los vigentes: en revisores es el único, en consolidadores el que encabeza. */
  primero(efectivos: AreaEfectivoDTO[]): AreaEfectivoDTO | undefined {
    return (efectivos ?? [])[0];
  }

  /** Cuántos vigentes hay además del primero, para el contador "+N más". */
  restantes(efectivos: AreaEfectivoDTO[]): number {
    return Math.max(0, (efectivos ?? []).length - 1);
  }

  /**
   * Etiqueta entre paréntesis: si a esa persona la puso alguien a mano o la dedujo el sistema.
   * `Gth` es el último recurso de revisores, cuando el área no tiene ni asignación ni jefe/gerente
   * en toda su rama.
   */
  origenLabel(origen?: AreaEfectivoOrigen | null): string {
    if (origen === 'Personalizado') return 'Personalizado';
    if (origen === 'Gth') return 'Por defecto';
    return 'Algoritmo';
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  get filteredRows(): AreaAsignacionItemDTO[] {
    return this.rows.filter((r) => {
      // Los filtros miran a los VIGENTES (los del área y los de cada uno de sus proyectos), no
      // solo lo asignado a mano: si no, buscar a alguien que puso el algoritmo no devolvería nada.
      const vigentes = [...(r.efectivos ?? []), ...(r.proyectos ?? []).flatMap((p) => p.efectivos ?? [])];
      const matchesName =
        !this.searchText.trim() ||
        SearchInput.matches(r.areaName ?? '', this.searchText) ||
        vigentes.some((e) => SearchInput.matches(e.nombre ?? '', this.searchText)) ||
        (r.asignados ?? []).some((a) => SearchInput.matches(a.fullName ?? '', this.searchText));
      const matchesPersona =
        this.personaFilter == null ||
        vigentes.some((e) => e.workerId === this.personaFilter) ||
        (r.asignados ?? []).some((a) => a.workerId === this.personaFilter);
      const matchesParent = this.parentFilter == null || r.parentName === this.parentFilter;
      return matchesName && matchesPersona && matchesParent;
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

  /** Personas asignadas en la lista (opciones del filtro). */
  get personaFilterOptions(): AreaWorkerOptionDTO[] {
    const seen = new Map<number, AreaWorkerOptionDTO>();
    for (const r of this.rows) {
      for (const a of r.asignados ?? []) {
        if (!seen.has(a.workerId)) {
          seen.set(a.workerId, { workerId: a.workerId, fullName: a.fullName, email: a.email });
        }
      }
    }
    return [...seen.values()].sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.personaFilter !== null) n++;
    if (this.parentFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.personaFilter = null;
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

  get pagedRows(): AreaAsignacionItemDTO[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.filteredRows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  changePage(page: number): void {
    this.currentPage = page;
  }
}
