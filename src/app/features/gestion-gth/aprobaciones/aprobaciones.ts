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
import {
  AprobacionListItem,
  AprobacionNivel,
  AprobacionNivelResumen,
  AprobacionesResumen,
} from './dtos/aprobaciones.dto';

/**
 * «Aprobaciones» (Gestión GTH): la bandeja de los gerentes. Cada fila es una solicitud de personal
 * con DOS casillas de decisión —el visto bueno del gerente del área y la aprobación de Gerencia
 * General, que es la obligatoria y la que la manda a GTH.
 *
 * El rol abre la pantalla; lo que se ve dentro depende de la CATEGORÍA de la ficha de trabajador y
 * lo resuelve el backend (`nivel`):
 *   • Gerente General → todas las solicitudes, y decide en la casilla de Gerencia General.
 *   • Gerente → solo las de su área hacia abajo, y decide en la casilla del gerente del área.
 *   • Cualquier otra categoría → ninguna solicitud; la pantalla explica por qué.
 *
 * Todo lo que depende del nivel (tarjetas, columnas, textos) se deriva de ese campo: la pantalla no
 * decide por su cuenta quién es quién, solo pinta lo que el backend ya filtró.
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

    /* El encabezado de la tabla es sticky (<thead class="sticky top-0">) y, como el wrap
       no recorta (ver arriba), su contenedor de scroll es .page-container. Chrome ancla
       los sticky al *content box* del contenedor de scroll — o sea por debajo de su
       padding-top — pero recorta en el borde exterior: esos 20px de padding quedaban
       como una banda visible POR ENCIMA del encabezado y ahí se seguían pintando las
       filas al scrollear (bug real: se veían registros arriba de la fila de encabezado).
       Con padding-top:0 el tope donde se ancla el encabezado y el borde donde se recorta
       coinciden, así que las filas desaparecen exactamente detrás de él. El aire de
       arriba lo aporta ahora el margin-top del primer bloque (las tarjetas de resumen),
       que scrollea con el contenido como cualquier otra cosa, en vez del padding del
       contenedor; los valores replican el padding-top global de .page-container (16px en
       teléfono, 20px desde 640px) para no cambiar nada visualmente.
       Acá la lista todavía es corta y casi no scrollea, pero el bug es el mismo en cuanto
       crezca: va igual que en Reclutamiento y Solicitud de Personal. */
    .page-container { padding-top: 0; }
    .page-container > *:first-child { margin-top: 16px; }
    @media (min-width: 640px) {
      .page-container > *:first-child { margin-top: 20px; }
    }

    /* ── Aviso de alcance ─────────────────────────────────────────────────
       Explica de dónde sale lo que el usuario ve (o por qué no ve nada). No es
       decorativo: sin él, un gerente que solo ve 2 de las 20 solicitudes de la
       empresa no tiene forma de saber si es un filtro o un error. */
    .ap-scope {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 11px 14px; border-radius: var(--radius-standard);
      background: var(--color-abril-logo-blue-light); border: 0.5px solid #a9c9e6;
      color: #1e4a6d; font-size: 12.5px; line-height: 1.45;
    }
    .ap-scope i { font-size: 17px; color: var(--color-abril-logo-blue); flex-shrink: 0; margin-top: 1px; }
    .ap-scope--empty { background: #FEF3C7; border-color: #FCD34D; color: #78350F; }
    .ap-scope--empty i { color: #B45309; }

    /* ── Responsive ───────────────────────────────────────────────────────
       Las 8 columnas no entran por debajo de ~1100px y, como acá el wrapper no
       recorta, el desborde lo terminaba scrolleando toda la página de lado.
       Debajo de ese ancho la tabla se cambia por tarjetas: misma lista, mismo
       filtro, misma paginación y misma acción. */
    .ap-cards { display: none; }

    @media (max-width: 1099.98px) {
      .abril-table-wrap { display: none; }
      .ap-cards { display: grid; grid-template-columns: 1fr; gap: 10px; }
    }

    @media (min-width: 640px) and (max-width: 1099.98px) {
      .ap-cards { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
    }

    /* Las dos casillas dentro de la tarjeta, una al lado de la otra. */
    .ap-card-niveles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 9px; }
    .ap-card-nivel {
      border: 0.5px solid var(--color-abril-border); border-radius: var(--radius-standard);
      padding: 7px 8px; min-width: 0;
    }
    .ap-nivel-label {
      font-size: 9px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.03em; color: #9ca3af; margin-bottom: 4px;
    }
    .ap-nivel-quien { font-size: 10.5px; color: #9ca3af; margin-top: 3px; line-height: 1.25; }

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

  /** Nivel del usuario. Hasta que responde el backend se asume el más restrictivo. */
  nivel: AprobacionNivel = 'NINGUNO';

  /** Área de la que el usuario es gerente (solo con nivel GERENTE_AREA). */
  areaAlcance: string | null = null;

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
        this.nivel = data.nivel;
        this.areaAlcance = data.areaAlcance;
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

  // ── Nivel del usuario ──────────────────────────────────────────────────
  get esGerenteGeneral(): boolean {
    return this.nivel === 'GERENTE_GENERAL';
  }

  /** Sin nivel: la pantalla se abre por rol, pero no hay solicitudes bajo su alcance. */
  get sinAlcance(): boolean {
    return this.nivel === 'NINGUNO';
  }

  /** Casilla del usuario en una fila: es contra la suya que se ordena, filtra y cuenta. */
  miCasilla(a: AprobacionListItem): AprobacionNivelResumen {
    return this.esGerenteGeneral ? a.gerenteGeneral : a.gerenteArea;
  }

  get subtitulo(): string {
    if (this.esGerenteGeneral) {
      return 'Aprueba o rechaza las solicitudes de personal de toda la organización.';
    }
    if (this.nivel === 'GERENTE_AREA') {
      return 'Da tu visto bueno a las solicitudes de personal de tu gerencia.';
    }
    return 'Solicitudes de personal por aprobar.';
  }

  /** Aviso que explica de dónde sale lo que el usuario ve. */
  get textoAlcance(): string {
    if (this.esGerenteGeneral) {
      return (
        'Ves todas las solicitudes de la organización. Tu aprobación es la obligatoria: ' +
        'al confirmarla, las vacantes aprobadas pasan a Gestión de Talento Humano.'
      );
    }
    if (this.nivel === 'GERENTE_AREA') {
      const area = this.areaAlcance ? `de ${this.areaAlcance}` : 'de tu gerencia';
      return (
        `Ves solo las solicitudes ${area} y de las áreas que dependen de ella. Tu visto bueno ` +
        'queda registrado, pero la solicitud avanza recién con la aprobación de Gerencia General.'
      );
    }
    return (
      'Tu ficha de trabajador no es de Gerencia General ni de gerente de área, así que no hay ' +
      'solicitudes de personal bajo tu alcance. Si crees que debería haberlas, pide a Gestión ' +
      'del Talento Humano que revise la categoría de tu ficha.'
    );
  }

  // ── Textos de las tarjetas (dependen del nivel) ────────────────────────
  get kpiPendientes(): { label: string; sub: string } {
    return this.esGerenteGeneral
      ? { label: 'Por aprobar', sub: 'Esperan tu decisión' }
      : { label: 'Por revisar', sub: 'Esperan tu visto bueno' };
  }

  get kpiAprobadas(): { label: string; sub: string } {
    return this.esGerenteGeneral
      ? { label: 'Aprobadas', sub: 'Total o parcialmente' }
      : { label: 'Con tu visto bueno', sub: 'Total o parcialmente' };
  }

  get kpiRechazadas(): { label: string; sub: string } {
    return this.esGerenteGeneral
      ? { label: 'Rechazadas', sub: 'Ninguna vacante continuó' }
      : { label: 'Observadas', sub: 'Las rechazaste todas' };
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
      // El filtro de estado va contra la casilla del usuario: es su decisión la que le
      // interesa rastrear, no la del otro nivel.
      if (this.estadoCodigo && this.miCasilla(a).estadoCodigo !== this.estadoCodigo) return false;
      if (!q) return true;
      return SearchInput.matches(
        [a.codigos, a.area, a.solicitanteNombre, this.miCasilla(a).estadoNombre]
          .filter(Boolean)
          .join(' '),
        q,
      );
    });

    // Lo que espera MI decisión primero: es lo único sobre lo que el usuario puede actuar
    // y, sin esto, una solicitud por decidir puede quedar sepultada en la página 3 del
    // historial. Dentro de cada bloque, lo más reciente arriba.
    return lista.sort((a, b) => {
      if (a.esperaMiDecision !== b.esperaMiDecision) return a.esperaMiDecision ? -1 : 1;
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

  /**
   * Resumen "3 de 4 aprobadas" bajo el total de vacantes, según la casilla del usuario; en las
   * que aún espera su decisión, solo cuántas le faltan por decidir.
   */
  detalleVacantes(a: AprobacionListItem): string {
    const mia = this.miCasilla(a);
    if (!mia.decidida) return `${a.totalVacantes} por decidir`;
    if (mia.vacantesRechazadas === 0) return `${mia.vacantesAprobadas} aprobadas`;
    if (mia.vacantesAprobadas === 0) return `${mia.vacantesRechazadas} rechazadas`;
    return `${mia.vacantesAprobadas} de ${a.totalVacantes} aprobadas`;
  }

  /** Texto del botón de la fila: decidir si le toca, consultar si ya pasó por ahí. */
  textoAccion(a: AprobacionListItem): string {
    if (!a.esperaMiDecision) return 'Ver decisión';
    return this.esGerenteGeneral ? 'Revisar y aprobar' : 'Revisar y dar visto bueno';
  }
}
