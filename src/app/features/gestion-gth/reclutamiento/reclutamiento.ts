import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { ClientPager } from '../../../shared/utils/client-pager';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { ReclutamientoService } from './services/reclutamiento.service';
import { Opcion, RequerimientoGthListItem } from './dtos/reclutamiento.dto';
import { GthDetalleRequerimiento } from './components/detalle/detalle';
import { estadoColors } from './estado-colors';

/**
 * Vista de GTH del módulo Reclutamiento: bandeja con la tarjeta "En proceso" y la tabla de
 * "Solicitudes de contratación" de toda la organización. Es la contraparte de la vista del
 * solicitante (Solicitud de Personal); aquí GTH ve y gestiona lo que piden las jefaturas.
 * Por ahora solo muestra la tarjeta y la tabla; el resto de tarjetas, el pipeline y las
 * acciones se irán agregando.
 */
@Component({
  standalone: true,
  selector: 'app-gth-reclutamiento',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    StatusBadge,
    TitleCasePipe,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    GthDetalleRequerimiento,
  ],
  templateUrl: './reclutamiento.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    /* El desplegable de Prioridad (position:absolute, z-50) debe sobreponerse en vez
       de quedar recortado por el overflow del wrap: al no recortar, no aparece scroll
       ni se empuja el contenido. Scoped a este componente (no afecta otras tablas). */
    .abril-table-wrap { overflow: visible; }
  `],
})
export class GthReclutamiento implements OnInit {
  anioActual = new Date().getFullYear();

  enProceso = 0;
  solicitudes: RequerimientoGthListItem[] = [];
  /** Catálogo de prioridades (Alta/Media/Baja) para el desplegable de la columna. */
  prioridades: Opcion[] = [];

  // ── Filtros ───────────────────────────────────────────────────────────
  searchText = '';
  filtrosAbiertos = false;

  /** Requerimiento abierto en el modal de detalle (null = modal cerrado). */
  detalleId: number | null = null;

  private readonly pager = new ClientPager<RequerimientoGthListItem>();

  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getBandeja().subscribe({
      next: (data) => {
        this.enProceso = data.resumen.enProceso;
        this.solicitudes = data.solicitudes;
        this.prioridades = data.prioridades;
        this.pager.reset();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Cambia la prioridad de un requerimiento desde el desplegable de la tabla. Actualiza de forma
   * optimista y revierte si el guardado falla. (allowClear está desactivado, así que el valor
   * nunca llega null desde el combo, pero se protege igual.)
   */
  onPrioridadChange(s: RequerimientoGthListItem, prioridadId: number | null): void {
    if (prioridadId == null || prioridadId === s.prioridadId) return;

    const prevId = s.prioridadId;
    const prevNombre = s.prioridadNombre;
    s.prioridadId = prioridadId;
    s.prioridadNombre = this.prioridades.find((p) => p.id === prioridadId)?.nombre ?? s.prioridadNombre;

    this.service.updatePrioridad(s.requerimientoId, prioridadId).subscribe({
      error: (err: HttpErrorResponse) => {
        s.prioridadId = prevId;
        s.prioridadNombre = prevNombre;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Filtro de texto ────────────────────────────────────────────────────
  get filtrosActivos(): number {
    return this.searchText.trim() ? 1 : 0;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredSolicitudes(): RequerimientoGthListItem[] {
    const q = this.searchText.trim();
    if (!q) return this.solicitudes;
    return this.solicitudes.filter((s) =>
      SearchInput.matches(
        [s.codigo, s.puesto, s.area, s.proyectoObra, s.estadoNombre].filter(Boolean).join(' '),
        q,
      ),
    );
  }

  // ── Paginación (cliente) ───────────────────────────────────────────────
  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredSolicitudes);
  }

  get pagedSolicitudes(): RequerimientoGthListItem[] {
    return this.pager.page(this.filteredSolicitudes);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Modal de detalle (ojo de la tabla) ─────────────────────────────────
  abrirDetalle(s: RequerimientoGthListItem): void {
    this.detalleId = s.requerimientoId;
  }

  /** Cierra el modal de detalle; si hubo cambios guardados, refresca la bandeja. */
  onDetalleCerrado(huboCambios: boolean): void {
    this.detalleId = null;
    if (huboCambios) this.load();
  }

  // ── Colores del badge de estado (compartidos con el modal de detalle) ───
  estadoColors = estadoColors;
}
