import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { ClientPager } from '../../../shared/utils/client-pager';
import { AuthService } from '../../../core/services/auth.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { GthAprobacionDecision } from './components/decision/decision';
import { AprobacionesService } from './services/aprobaciones.service';
import { estadoAprobacionColors } from './estado-aprobacion-colors';
import { AprobacionListItem, AprobacionesResumen } from './dtos/aprobaciones.dto';

/**
 * «Aprobaciones» (Gestión GTH): la bandeja de Gerencia. Cada fila es una solicitud de personal que
 * necesita —o ya recibió— la decisión de Gerencia General.
 *
 * Sustituye a la página pública por token a la que llevaba el correo: ahora el enlace del correo
 * apunta acá (`/gestion-gth/aprobaciones/:id`) y, si no hay sesión, el login devuelve al usuario a
 * esa misma URL. El beneficio principal es que la decisión deja historial consultable —antes se
 * aprobaba por correo y en la aplicación no quedaba rastro visible.
 */
@Component({
  standalone: true,
  selector: 'app-gth-aprobaciones',
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
    GthAprobacionDecision,
  ],
  templateUrl: './aprobaciones.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    /* Igual que en Solicitud de Personal: la tabla crece a su altura natural y el
       scroll queda en .page-container, no dentro del wrapper. */
    .abril-table-wrap { flex: 0 0 auto; overflow: visible; }

    /* ── Responsive ───────────────────────────────────────────────────────
       Las 7 columnas no entran por debajo de ~1024px y, como acá el wrapper no
       recorta, el desborde lo terminaba scrolleando toda la página de lado.
       Debajo de ese ancho la tabla se cambia por tarjetas: misma lista, mismo
       filtro, misma paginación y misma acción. */
    .ap-cards { display: none; }

    @media (max-width: 1023.98px) {
      .abril-table-wrap { display: none; }
      .ap-cards { display: grid; grid-template-columns: 1fr; gap: 10px; }
    }

    @media (min-width: 640px) and (max-width: 1023.98px) {
      .ap-cards { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    }

    @media (max-width: 639.98px) {
      .page-container { gap: 12px; }
      .ap-kpis { gap: 10px; }
      .ap-kpi { padding: 10px 11px; gap: 10px; }
      .ap-kpi-icon { width: 34px; height: 34px; border-radius: 8px; }
      .ap-kpi-svg { width: 18px; height: 18px; }
      .ap-kpi-value { font-size: 20px; }
      .ap-kpi-label { font-size: 11.5px; margin-top: 3px; line-height: 1.2; }
      .ap-kpi-sub { font-size: 10px; line-height: 1.2; }
    }
  `],
})
export class GthAprobaciones implements OnInit {
  anioActual = new Date().getFullYear();

  /** Aprobación abierta en el modal (null = cerrado). */
  detalleId: number | null = null;

  resumen: AprobacionesResumen = {
    pendientes: 0,
    vacantesPendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
  };

  aprobaciones: AprobacionListItem[] = [];

  // ── Filtros ───────────────────────────────────────────────────────────
  searchText = '';
  /** '' = todas. Los demás valores son códigos de gth_aprobacion_gg_estado. */
  estadoCodigo = '';
  filtrosAbiertos = false;

  /** Opciones del filtro de estado. Orden semántico (pendiente → cerrada), no alfabético. */
  readonly estados = [
    { codigo: '', nombre: 'Todos los estados' },
    { codigo: 'PENDIENTE', nombre: 'Pendiente de decisión' },
    { codigo: 'APROBADA', nombre: 'Aprobada (todas)' },
    { codigo: 'APROBADA_PARCIAL', nombre: 'Aprobada parcialmente' },
    { codigo: 'RECHAZADA', nombre: 'Rechazada (todas)' },
  ];

  private readonly pager = new ClientPager<AprobacionListItem>();

  constructor(
    private service: AprobacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /** feature_key que habilita la configuración (dinámico vía role_feature en BD). */
  private static readonly FEATURE_CONFIG = 'gestion-gth.reclutamiento.configuracion';

  /** ¿El usuario tiene acceso a la configuración? (según los roles asignados a la feature). */
  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(GthAprobaciones.FEATURE_CONFIG);
  }

  /** Botón "Configuración" del header: solo si el rol del usuario tiene la feature. */
  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  /** Lleva a la pantalla de configuración del correo que sale al decidir. */
  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-gth/aprobaciones/configuracion']);
  }

  ngOnInit(): void {
    // `/gestion-gth/aprobaciones/:id` es la URL del enlace del correo: abre esa
    // solicitud directamente. Sin id, la pantalla es solo la lista.
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) this.detalleId = id;

    this.load();
  }

  load(): void {
    this.loaderService.show();
    // App zoneless: hay que forzar el refresco tras el subscribe o la vista no se actualiza.
    this.service.getPanel().subscribe({
      next: (data) => {
        this.resumen = data.resumen;
        this.aprobaciones = data.aprobaciones;
        this.pager.reset();
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Modal de decisión ──────────────────────────────────────────────────
  abrir(a: AprobacionListItem): void {
    this.detalleId = a.aprobacionId;
  }

  cerrarDetalle(): void {
    this.detalleId = null;
    // Si se llegó por el enlace del correo (`/aprobaciones/:id`), se limpia la URL
    // para que un refresco no vuelva a abrir el modal.
    if (this.route.snapshot.paramMap.get('id')) {
      this.router.navigate(['/gestion-gth/aprobaciones']);
      return;
    }
    this.cdr.detectChanges();
  }

  // ── Filtros ────────────────────────────────────────────────────────────
  get filtrosActivos(): number {
    return (this.searchText.trim() ? 1 : 0) + (this.estadoCodigo ? 1 : 0);
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoCodigo = '';
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredAprobaciones(): AprobacionListItem[] {
    const q = this.searchText.trim();
    const lista = this.aprobaciones.filter((a) => {
      if (this.estadoCodigo && a.estadoCodigo !== this.estadoCodigo) return false;
      if (!q) return true;
      return SearchInput.matches(
        [a.codigos, a.area, a.solicitanteNombre, a.estadoNombre].filter(Boolean).join(' '),
        q,
      );
    });

    // Lo pendiente primero: es lo único sobre lo que el gerente puede actuar y, sin
    // esto, una solicitud por decidir puede quedar sepultada en la página 3 del
    // historial. Dentro de cada bloque, lo más reciente arriba.
    return lista.sort((a, b) => {
      if (a.decidida !== b.decidida) return a.decidida ? 1 : -1;
      return b.enviado.localeCompare(a.enviado);
    });
  }

  get mensajeVacio(): string {
    return this.filtrosActivos > 0
      ? 'Sin resultados para los filtros aplicados.'
      : 'Todavía no hay solicitudes de personal para aprobar.';
  }

  // ── Paginación (cliente) ───────────────────────────────────────────────
  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredAprobaciones);
  }

  get pagedAprobaciones(): AprobacionListItem[] {
    return this.pager.page(this.filteredAprobaciones);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Presentación ───────────────────────────────────────────────────────
  readonly estadoColors = estadoAprobacionColors;

  /** Resumen "3 de 4 aprobadas" de la columna Vacantes; en las pendientes, solo el total. */
  detalleVacantes(a: AprobacionListItem): string {
    if (!a.decidida) return `${a.totalVacantes} por decidir`;
    if (a.vacantesRechazadas === 0) return `${a.vacantesAprobadas} aprobadas`;
    if (a.vacantesAprobadas === 0) return `${a.vacantesRechazadas} rechazadas`;
    return `${a.vacantesAprobadas} de ${a.totalVacantes} aprobadas`;
  }
}
