import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../shared/components/fab-button/fab-button';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { ClientPager } from '../../../shared/utils/client-pager';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AuthService } from '../../../core/services/auth.service';
import { GthNuevaSolicitud } from './components/nueva-solicitud/nueva-solicitud';
import { GthConfiguracionCorreos } from '../shared/configuracion-correos/configuracion-correos';
import { GthSeguimiento } from './components/seguimiento/seguimiento';
import { GthRevisionLongList } from './components/revision-long-list/revision-long-list';
import { SolicitudPersonalService } from './services/solicitud-personal.service';
import { GestionCandidatoCard, SolicitudVacanteListItem } from './dtos/solicitud-personal.dto';

@Component({
  standalone: true,
  selector: 'app-gth-solicitud-personal',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    FabButton,
    StatusBadge,
    TitleCasePipe,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    GthNuevaSolicitud,
    GthConfiguracionCorreos,
    GthSeguimiento,
    GthRevisionLongList,
  ],
  templateUrl: './solicitud-personal.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthSolicitudPersonal implements OnInit {
  anioActual = new Date().getFullYear();
  showModal = false;
  showConfig = false;

  /** Requerimiento cuyo seguimiento se está viendo (null = modal cerrado). */
  seguimientoId: number | null = null;

  /** Requerimiento cuya long list se está revisando (null = modal cerrado). */
  revisionId: number | null = null;

  /** Tarjetas "Gestión de candidatos" (long lists que GTH ya envió para revisar). */
  gestionCandidatos: GestionCandidatoCard[] = [];

  solicitudes: SolicitudVacanteListItem[] = [];

  // ── Filtros ───────────────────────────────────────────────────────────
  searchText = '';
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<SolicitudVacanteListItem>();

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
  ) {}

  /** feature_key que habilita la configuración (dinámico vía role_feature en BD). */
  private static readonly FEATURE_CONFIG = 'gestion-gth.reclutamiento.configuracion';

  /** ¿El usuario tiene acceso a la configuración? (según los roles asignados a la feature). */
  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(GthSolicitudPersonal.FEATURE_CONFIG);
  }

  /** Botón "Configuración" del header: solo si el rol del usuario tiene la feature. */
  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getPanel().subscribe({
      next: (data) => {
        this.gestionCandidatos = data.gestionCandidatos;
        this.solicitudes = data.misSolicitudes;
        this.pager.reset();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSaved(): void {
    // Al registrar, recargamos la tabla y cerramos el modal. El resto del flujo
    // (bandeja, pipeline, métricas) se implementará después.
    this.showModal = false;
    this.load();
  }

  // ── Seguimiento del requerimiento ──────────────────────────────────────
  abrirSeguimiento(s: SolicitudVacanteListItem): void {
    this.seguimientoId = s.requerimientoId;
  }

  cerrarSeguimiento(): void {
    this.seguimientoId = null;
  }

  // ── Revisión de la long list ("Revisar long list y CVs") ───────────────
  abrirRevision(c: GestionCandidatoCard): void {
    this.revisionId = c.requerimientoId;
  }

  cerrarRevision(): void {
    this.revisionId = null;
  }

  // ── Tarjetas resumen (solo las dos que ya funcionan) ───────────────────
  get totalRegistradas(): number {
    return this.solicitudes.length;
  }

  /** "Pendientes sin respuesta": aún en estado inicial (GTH no ha respondido). */
  get pendientes(): number {
    return this.solicitudes.filter((s) => s.estadoCodigo === 'NUEVO').length;
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

  get filteredSolicitudes(): SolicitudVacanteListItem[] {
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

  get pagedSolicitudes(): SolicitudVacanteListItem[] {
    return this.pager.page(this.filteredSolicitudes);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Colores del badge de estado ────────────────────────────────────────
  estadoColors(codigo: string): { bg: string; text: string } {
    switch (codigo) {
      case 'NUEVO':      return { bg: '#DBEAFE', text: '#1D4ED8' };
      default:           return { bg: '#F3F4F6', text: '#374151' };
    }
  }
}
