import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
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
import { GthSeguimiento } from './components/seguimiento/seguimiento';
import { GthRevisionLongList } from './components/revision-long-list/revision-long-list';
import { GthRevisionFinalistas } from './components/revision-finalistas/revision-finalistas';
import { SolicitudPersonalService } from './services/solicitud-personal.service';
import { AprobacionGerenciaService } from '../shared/services/aprobacion-gerencia.service';
import { estadoColors } from '../shared/estado-colors';
import {
  GestionCandidatoCard,
  ResumenSolicitantePanel,
  SolicitudVacanteListItem,
} from './dtos/solicitud-personal.dto';

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
    GthSeguimiento,
    GthRevisionLongList,
    GthRevisionFinalistas,
  ],
  templateUrl: './solicitud-personal.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    /* La tabla no scrollea internamente: crece a su altura natural y el scroll
       queda en .page-container (toda la página actual), como en Lecciones
       Aprendidas. Override local (solo este componente por encapsulación) — la
       clase global .abril-table-wrap sigue con scroll interno para las demás
       páginas. */
    .abril-table-wrap { flex: 0 0 auto; overflow: visible; }

    /* ── Responsive ───────────────────────────────────────────────────────
       Las 7 columnas de la tabla no entran por debajo de ~1024px y, como acá
       .abril-table-wrap no recorta (overflow:visible, ver arriba), ese
       desborde lo terminaba scrolleando .page-container: al desplazarse para
       ver la tabla se arrastraba de lado TODA la vista — tarjetas de resumen
       y gestión de candidatos incluidas. Debajo de ese ancho la tabla se
       cambia por tarjetas, mismo patrón que Reclutamiento GTH y que
       Revisiones/Observaciones de Arquitectura Comercial. La lista es la
       misma: comparten filtro, paginación y acción. */
    .sp-cards { display: none; }

    @media (max-width: 1023.98px) {
      .abril-table-wrap { display: none; }
      .sp-cards { display: grid; grid-template-columns: 1fr; gap: 10px; }
    }

    /* Tablet: una sola columna de tarjetas queda enorme y vacía; con auto-fill
       entran dos por fila sin cambiar nada del layout del teléfono. */
    @media (min-width: 640px) and (max-width: 1023.98px) {
      .sp-cards { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    }

    /* Teléfono. Todo acotado a este @media para no alterar el desktop. */
    @media (max-width: 639.98px) {
      .page-container { gap: 12px; }

      /* Las 4 tarjetas de resumen apiladas ocupaban ~400px de alto, casi una
         pantalla completa antes de ver la lista. */
      .sp-kpis { gap: 10px; }
      .sp-kpi { padding: 10px 11px; gap: 10px; }
      .sp-kpi-icon { width: 34px; height: 34px; border-radius: 8px; }
      .sp-kpi-svg { width: 18px; height: 18px; }
      .sp-kpi-value { font-size: 20px; }
      .sp-kpi-label { font-size: 11.5px; margin-top: 3px; line-height: 1.2; }
      .sp-kpi-sub { font-size: 10px; line-height: 1.2; }

      /* "Gestión de candidatos": el botón es largo ("Revisar long list y CVs")
         y era shrink-0, así que en fila se quedaba con casi todo el ancho y
         dejaba el texto de la izquierda reducido a unos pocos píxeles. En
         columna, el bloque de texto usa el ancho completo y el botón queda
         debajo como acción de la tarjeta. */
      .sp-cand-box { padding: 12px; }
      .sp-cand-row { flex-direction: column; align-items: stretch; gap: 12px; padding: 12px; }
      .sp-cand-btn { width: 100%; }
    }
  `],
})
export class GthSolicitudPersonal implements OnInit {
  anioActual = new Date().getFullYear();
  showModal = false;

  /** Requerimiento cuyo seguimiento se está viendo (null = modal cerrado). */
  seguimientoId: number | null = null;

  /** Requerimiento cuya long list se está revisando (null = modal cerrado). */
  revisionId: number | null = null;

  /** Requerimiento cuyo informe de finalistas se está viendo (null = modal cerrado). */
  finalistasId: number | null = null;

  /** Contadores de las tarjetas resumen (los calcula el backend junto con el panel). */
  resumen: ResumenSolicitantePanel = {
    totalRegistradas: 0,
    pendientes: 0,
    enRevisionGth: 0,
    aprobadas: 0,
  };

  /**
   * Tarjetas "Gestión de candidatos": long lists que GTH envió para revisar (tipo LONG_LIST)
   * e informes de finalistas ya evaluados (tipo FINALISTAS).
   */
  gestionCandidatos: GestionCandidatoCard[] = [];

  solicitudes: SolicitudVacanteListItem[] = [];

  // ── Filtros ───────────────────────────────────────────────────────────
  searchText = '';
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<SolicitudVacanteListItem>();

  constructor(
    private service: SolicitudPersonalService,
    private aprobacionGg: AprobacionGerenciaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
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

  /** Lleva a la pantalla de configuración de correos (ya no es un modal). */
  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-gth/solicitud-personal/configuracion']);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getPanel().subscribe({
      next: (data) => {
        this.resumen = data.resumen;
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

  // ── Tarjetas de "Gestión de candidatos" ────────────────────────────────
  /** Abre el modal que corresponde a la tarjeta: long list por decidir o informe de finalistas. */
  abrirGestionCandidatos(c: GestionCandidatoCard): void {
    if (c.tipo === 'FINALISTAS') this.finalistasId = c.requerimientoId;
    else this.revisionId = c.requerimientoId;
  }

  cerrarRevision(): void {
    this.revisionId = null;
  }

  cerrarFinalistas(): void {
    this.finalistasId = null;
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

  /** Mensaje de lista vacía, compartido por la tabla (desktop) y las tarjetas (móvil). */
  get mensajeVacio(): string {
    return this.searchText.trim()
      ? 'Sin resultados para la búsqueda.'
      : 'Aún no has registrado solicitudes de vacante. Usa el botón «Nueva solicitud».';
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
  /** Mismo mapa que usa la bandeja de GTH: un estado se pinta igual en todo el módulo. */
  readonly estadoColors = estadoColors;

  // ── Reenvío del correo a Gerencia General ──────────────────────────────
  /**
   * El requerimiento está esperando la decisión de Gerencia General: se puede reenviar el correo
   * (sirve cuando el envío automático falló o hubo que corregir los destinatarios).
   */
  esperandoGerencia(s: SolicitudVacanteListItem): boolean {
    return s.estadoCodigo === 'APROBACION_GG';
  }

  async reenviarAGerencia(s: SolicitudVacanteListItem): Promise<void> {
    const confirm = await Swal.fire({
      title: '¿Reenviar a Gerencia General?',
      text: `Se volverá a enviar el correo de aprobación de ${s.codigo} con el mismo enlace.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reenviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-standard)',
    });
    if (!confirm.isConfirmed) return;

    this.loaderService.show();
    this.aprobacionGg.reenviar(s.requerimientoId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        Swal.fire({
          title: 'Correo reenviado',
          text: res.message,
          icon: 'success',
          confirmButtonColor: 'var(--color-abril-standard)',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }
}
