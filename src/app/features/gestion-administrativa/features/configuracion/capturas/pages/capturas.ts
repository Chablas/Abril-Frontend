import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GaCapturasAreaService } from '../services/capturas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  GaCapturaAreaItemDto,
  GaCapturaAreaTipoOptionDto,
} from '../dtos/ga-captura-area.dto';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

/** Opción del filtro de área, con el nombre ya desambiguado por su padre. */
interface AreaFilterOption {
  areaScopeId: number;
  label: string;
}

/**
 * Configuración → Capturas: por área, si sus trabajadores deben subir capturas de movilidad para
 * poder rendir una salida.
 *
 * Se listan TODAS las áreas activas de la data maestra (`area_scope`), una fila por nodo y sin
 * colapsar ramas — a diferencia de Revisores de Áreas, que solo lista el primer nodo de su tipo en
 * cada rama. Cada nodo se configura por separado: "Unidad de Proyectos" puede tener las capturas en
 * opcional e "Ingeniería BIM", su hija, en obligatorio.
 *
 * El default es obligatorio y lo resuelve el backend, así que un área recién creada aparece acá ya
 * marcada sin que nadie la registre.
 */
@Component({
  standalone: true,
  selector: 'app-ga-capturas',
  imports: [CommonModule, Paginator, FilterModal, SearchInput, SearchSelect],
  templateUrl: './capturas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaCapturas implements OnInit {
  areas: GaCapturaAreaItemDto[] = [];
  tipos: GaCapturaAreaTipoOptionDto[] = [];

  searchText = '';
  /** Filtro por área concreta: areaScopeId o null = todas. */
  areaFilter: number | null = null;
  /** Filtro por tipo de área: areaTypeId o null = todos. */
  tipoFilter: number | null = null;
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<GaCapturaAreaItemDto>();

  constructor(
    private service: GaCapturasAreaService,
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
        this.areas = data.areas ?? [];
        this.tipos = data.tipos ?? [];
        this.pager.reset();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Prende/apaga la obligatoriedad del área. Optimista: si falla, se revierte la casilla. */
  toggleObligatorias(a: GaCapturaAreaItemDto): void {
    const nuevo = !a.capturasObligatorias;
    this.loaderService.show();
    this.service.setCapturasObligatorias(a.areaScopeId, { capturasObligatorias: nuevo }).subscribe({
      next: () => {
        a.capturasObligatorias = nuevo;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.areaFilter !== null) n++;
    if (this.tipoFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.areaFilter = null;
    this.tipoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredAreas(): GaCapturaAreaItemDto[] {
    return this.areas.filter((a) => {
      const matchesTexto =
        !this.searchText.trim() ||
        SearchInput.matches(a.areaName ?? '', this.searchText) ||
        SearchInput.matches(a.parentName ?? '', this.searchText);
      const matchesArea = this.areaFilter === null || a.areaScopeId === this.areaFilter;
      const matchesTipo = this.tipoFilter === null || a.areaTypeId === this.tipoFilter;
      return matchesTexto && matchesArea && matchesTipo;
    });
  }

  /**
   * Opciones del filtro de área. Los nombres se repiten entre ramas (hay dos "Producción" y dos
   * "Unidad de Proyectos"), así que a los repetidos se les agrega el padre entre paréntesis.
   */
  get areaFilterOptions(): AreaFilterOption[] {
    const vecesPorNombre = new Map<string, number>();
    for (const a of this.areas) {
      const clave = (a.areaName ?? '').toLowerCase();
      vecesPorNombre.set(clave, (vecesPorNombre.get(clave) ?? 0) + 1);
    }

    return this.areas
      .map((a) => {
        const repetido = (vecesPorNombre.get((a.areaName ?? '').toLowerCase()) ?? 0) > 1;
        return {
          areaScopeId: a.areaScopeId,
          label: repetido && a.parentName ? `${a.areaName} (${a.parentName})` : a.areaName,
        };
      })
      .sort((x, y) => x.label.localeCompare(y.label));
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredAreas);
  }

  get pagedAreas(): GaCapturaAreaItemDto[] {
    return this.pager.page(this.filteredAreas);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }
}
