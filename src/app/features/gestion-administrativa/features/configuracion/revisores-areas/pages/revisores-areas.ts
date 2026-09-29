import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RevisoresAreasService } from '../services/revisores-areas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  ActorCeldaDTO,
  CatalogoActorDTO,
  PersonaOpcionDTO,
  RevisoresAreaFilaDTO,
  RevisoresAreaProyectoDTO,
} from '../dtos/revisores-areas.dto';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { ActorValor } from '../components/actor-valor/actor-valor';
import { RevisoresAreaDetalle } from '../components/detalle/detalle';

/**
 * Gestión Administrativa → Configuración → Revisores de Áreas.
 *
 * Una fila por área (y por obra en las que tienen gente en varias ubicaciones) con los cinco actores
 * que le tocan a un TRABAJADOR NORMAL de esa fila: quién aprueba la salida, qué jefe se entera,
 * quién aprueba la 1.ª revisión, quiénes consolidan y quiénes firman el consolidado. «Ver» abre el
 * detalle con todos los tipos de trabajador (oficina central, staff, jefe, residente, subgerente),
 * que se edita en el mismo modal.
 *
 * Reemplaza a las tres secciones que hacían lo mismo por separado en la configuración de Solicitud
 * de Salidas, Mis Rendiciones y Consolidados.
 */
@Component({
  standalone: true,
  selector: 'app-ga-revisores-areas',
  imports: [
    CommonModule,
    SearchSelect,
    SearchInput,
    Paginator,
    FilterModal,
    AbrilBulkActionDirective,
    ActorValor,
    RevisoresAreaDetalle,
  ],
  templateUrl: './revisores-areas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaRevisoresAreas implements OnInit {
  rows: RevisoresAreaFilaDTO[] = [];
  actores: CatalogoActorDTO[] = [];
  options: PersonaOpcionDTO[] = [];
  puedeEditar = false;
  cargado = false;

  // ── Filtros ───────────────────────────────────────────────────────────
  searchText = '';
  /** Nombre del área padre, o null = todas. */
  parentFilter: string | null = null;
  /** workerId de una persona que figure en alguna celda, o null = todas. */
  personaFilter: number | null = null;
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<RevisoresAreaFilaDTO>();

  /** Fila con el detalle abierto. */
  detalleDe: { areaScopeId: number; projectId: number | null } | null = null;

  constructor(
    private service: RevisoresAreasService,
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
        this.rows = data.areas;
        this.actores = data.actores;
        this.options = data.options;
        this.puedeEditar = data.puedeEditar;
        this.cargado = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Celdas ────────────────────────────────────────────────────────────

  /** La celda de un actor en una fila (vienen en el orden de las columnas, pero se busca por id). */
  celda(actores: ActorCeldaDTO[], actorId: number): ActorCeldaDTO | undefined {
    return actores.find((a) => a.actorId === actorId);
  }

  // ── Detalle ───────────────────────────────────────────────────────────

  verArea(r: RevisoresAreaFilaDTO): void {
    this.detalleDe = { areaScopeId: r.areaScopeId, projectId: null };
  }

  verProyecto(r: RevisoresAreaFilaDTO, p: RevisoresAreaProyectoDTO): void {
    this.detalleDe = { areaScopeId: r.areaScopeId, projectId: p.projectId };
  }

  cerrarDetalle(): void {
    this.detalleDe = null;
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  /** Todas las personas de una fila y de sus subfilas. */
  private personasDe(r: RevisoresAreaFilaDTO) {
    return [...r.actores, ...r.proyectos.flatMap((p) => p.actores)].flatMap((c) => c.personas);
  }

  get filteredRows(): RevisoresAreaFilaDTO[] {
    const texto = this.searchText.trim();
    return this.rows.filter((r) => {
      const personas = this.personasDe(r);
      const porTexto =
        !texto ||
        SearchInput.matches(r.areaName ?? '', texto) ||
        r.proyectos.some((p) => SearchInput.matches(p.projectName ?? '', texto)) ||
        personas.some((p) => SearchInput.matches(p.nombre ?? '', texto));
      const porPadre = this.parentFilter == null || r.parentName === this.parentFilter;
      const porPersona = this.personaFilter == null || personas.some((p) => p.workerId === this.personaFilter);
      return porTexto && porPadre && porPersona;
    });
  }

  get parentFilterOptions(): { name: string }[] {
    const vistos = new Set<string>();
    for (const r of this.rows) if (r.parentName) vistos.add(r.parentName);
    return [...vistos].sort((a, b) => a.localeCompare(b)).map((name) => ({ name }));
  }

  /** Las personas que figuran en la tabla (opciones del filtro por persona). */
  get personaFilterOptions(): { workerId: number; fullName: string }[] {
    const vistas = new Map<number, string>();
    for (const r of this.rows)
      for (const p of this.personasDe(r))
        if (p.workerId != null && !vistas.has(p.workerId)) vistas.set(p.workerId, p.nombre ?? '');
    return [...vistas.entries()]
      .map(([workerId, fullName]) => ({ workerId, fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.parentFilter !== null) n++;
    if (this.personaFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.parentFilter = null;
    this.personaFilter = null;
    this.pager.reset();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredRows);
  }

  get pagedRows(): RevisoresAreaFilaDTO[] {
    return this.pager.page(this.filteredRows);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }
}
