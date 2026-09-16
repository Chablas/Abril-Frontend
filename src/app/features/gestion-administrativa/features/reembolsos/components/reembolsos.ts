import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { ReembolsosService, ReembolsoQuery } from '../services/reembolsos.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  AreaNodeDto,
  PeriodoOptionDto,
  ReembolsoListItemDto,
  ResumenReembolsosDto,
} from '../dtos/reembolso.dto';
import { reembolsoColors, reembolsoLabelCorto } from '../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../shared/confirmar-correos';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { ReembolsoDetalleModal } from './reembolso-detalle-modal/reembolso-detalle-modal';
import { ReembolsoSeguimiento } from './reembolso-seguimiento/reembolso-seguimiento';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

/**
 * "Reembolsos": la bandeja de Tesorería, último paso del ciclo. Muestra los Consolidados del S10
 * que la jefatura ya firmó —de TODA la organización, porque Tesorería paga a todos— y son DOS
 * pasos, no uno (RG-26): primero se confirma la revisión documental (planillas, Consolidado del
 * S10, firma y trayectos con sus vouchers) y recién entonces se puede pagar.
 *
 * La unidad es el CONSOLIDADO y no la planilla, igual que en la pantalla donde la jefatura lo
 * firma: un mismo registro del S10 puede cubrir varias planillas, y es ese documento —con su
 * número de reembolso y su importe— el que se revisa y se desembolsa.
 *
 * La pantalla tiene dos vistas: la bandeja de trabajo y el Seguimiento, que es la consulta de lo
 * ya abonado por colaborador (11.4 del requerimiento).
 */
@Component({
  standalone: true,
  selector: 'app-reembolsos',
  imports: [
    CommonModule, DatePipe, StatusBadge, SearchSelect, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, AbrilBulkActionDirective, TitleCasePipe, SectionTabs,
    SearchInput, Paginator, ReembolsoDetalleModal, ReembolsoSeguimiento,
  ],
  templateUrl: './reembolsos.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    .resumen-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
    }
    .resumen-card {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 14px;
      border: 1px solid var(--color-abril-border);
      border-left: 3px solid var(--color-abril-border-strong);
      border-radius: var(--radius-md);
      background: #FFFFFF;
    }
    .resumen-card__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #6B7280;
    }
    .resumen-card__value { font-size: 22px; font-weight: 700; line-height: 1.1; color: var(--color-abril-ink); }
    .resumen-card__hint  { font-size: 11px; color: #9CA3AF; }
    .resumen-card--rev   { border-left-color: #4338CA; }
    .resumen-card--rev   .resumen-card__value { color: #4338CA; }
    .resumen-card--pend  { border-left-color: #C2410C; }
    .resumen-card--pend  .resumen-card__value { color: #C2410C; }
    .resumen-card--monto { border-left-color: var(--color-abril-warning); }
    .resumen-card--monto .resumen-card__value { color: var(--color-abril-warning-dark); font-size: 20px; }
    /* El mismo rojo del badge "Observado", para que la tarjeta y la fila se lean como lo mismo. */
    .resumen-card--obs   { border-left-color: #D30000; }
    .resumen-card--obs   .resumen-card__value { color: #D30000; }
    .resumen-card--ok    { border-left-color: #15803D; }
    .resumen-card--ok    .resumen-card__value { color: #15803D; }

    .doc-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border: 1px solid var(--color-abril-border);
      border-radius: 4px;
      background: #FFFFFF;
      color: #6B7280;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.4;
      white-space: nowrap;
      transition: background-color .15s ease, border-color .15s ease, color .15s ease;
    }
    .doc-chip:hover { border-color: var(--color-abril-standard); color: var(--color-abril-standard); }

    /* Código de una planilla cubierta. Las que todavía esperan a su jefatura van apagadas: se
       listan porque el importe declarado en el S10 las incluye, pero no se pagan todavía. */
    .ren-chip {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--color-abril-standard-light);
      color: var(--color-abril-standard);
      font-size: 10px;
      font-weight: 700;
      line-height: 1.5;
      white-space: nowrap;
    }
    .ren-chip--fuera { background: #F3F4F6; color: #9CA3AF; }
  `],
})
export class Reembolsos implements OnInit, OnDestroy {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();

  /** Las dos vistas de Tesorería: lo que hay por hacer y lo que ya se pagó. */
  readonly vistas: SectionTab[] = [
    { id: 'bandeja',     label: 'Reembolsos por pagar' },
    { id: 'seguimiento', label: 'Seguimiento de Tesorería' },
  ];
  vista = 'bandeja';

  consolidados: ReembolsoListItemDto[] = [];
  selectedIds = new Set<number>();
  detalleId: number | null = null;

  /**
   * Planilla que pidió abrir el enlace de un correo viejo (`?rendicion=`). Se resuelve al terminar
   * la carga: lo que se abre es el consolidado que la cubre, que es la unidad de esta pantalla.
   */
  private rendicionPendiente: number | null = null;

  resumen: ResumenReembolsosDto = {
    porRevisar: 0, porPagar: 0, montoPorPagar: 0, observadas: 0, pagadas: 0,
  };

  // ── Filtros ────────────────────────────────────────────────────────
  trabajadorOptions: any[] = [{ workerId: null, nombreCompleto: 'Todos los trabajadores' }];
  periodoOptions: { key: string | null; label: string }[] = [{ key: null, label: 'Todos los periodos' }];
  private periodos: PeriodoOptionDto[] = [];

  /**
   * Tesorería solo ve estos cuatro estados: el backend recorta igual, ofrecer otro sería un filtro
   * vacío. "Observadas" son las que devolvió ella misma — lo que observó la jefatura nunca llegó a
   * esta pantalla.
   */
  readonly estadoOptions = [
    { value: null,                        label: 'Todos los estados' },
    { value: 'Firmado',                   label: 'Firmados · por revisar' },
    { value: 'Proceder con el reembolso', label: 'Por pagar' },
    { value: 'Observado',                 label: 'Observados por Tesorería' },
    { value: 'Pagado',                    label: 'Pagados' },
  ];

  filters = {
    workerId:        null as number | null,
    estadoReembolso: null as string | null,
    periodoKey:      null as string | null,
  };

  /**
   * Búsqueda libre. Viaja al backend con el resto de los filtros —así las tarjetas cuentan lo
   * mismo que muestra la tabla— y por eso se dispara con retardo: una petición por tecla sería
   * una petición por letra escrita.
   */
  searchText = '';
  private readonly searchChange$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  filtrosAbiertos = false;

  private readonly pager = new ClientPager<ReembolsoListItemDto>();

  areaLevels: AreaCascadeNode[][] = [];
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim())               n++;
    if (this.filters.workerId != null)        n++;
    // El estado no aplica al seguimiento: ahí todo está pagado.
    if (this.filters.estadoReembolso != null && this.vista === 'bandeja') n++;
    if (this.filters.periodoKey != null)      n++;
    if (this.selectedAreaNodes.some((node) => node)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.filters = { workerId: null, estadoReembolso: null, periodoKey: null };
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.load();
  }

  constructor(
    private service: ReembolsosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Botón "Configuración" del header ─────────────────────────────────
  // Lleva a la configuración de ESTA pantalla: los correos que se originan en la bandeja de
  // Tesorería (hoy uno: el aviso de pago al colaborador). Se restringe con la misma feature que
  // antes protegía la sección Correos de Configuración: quien no la tiene no ve el botón.

  private static readonly FEATURE_CONFIG_CORREOS = 'gestion-administrativa.config.correos';

  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(Reembolsos.FEATURE_CONFIG_CORREOS);
  }

  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-administrativa/reembolsos/configuracion']);
  }

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.load());

    // Enlace directo del correo "Reembolso por pagar". Se lee ANTES de cargar: los correos nuevos
    // traen el consolidado y abren solos; los que salieron antes traen la planilla y se resuelven
    // cuando llega el listado.
    const consolidadoId = Number(this.route.snapshot.queryParamMap.get('consolidado'));
    if (consolidadoId > 0) this.detalleId = consolidadoId;

    const rendicionId = Number(this.route.snapshot.queryParamMap.get('rendicion'));
    if (consolidadoId <= 0 && rendicionId > 0) this.rendicionPendiente = rendicionId;

    this.loadFilterData();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** El input de búsqueda no llama a load() directo: pasa por el retardo. */
  onSearchChange(): void {
    this.searchChange$.next();
  }

  cambiarVista(id: string): void {
    if (this.vista === id) return;
    this.vista = id;
    this.selectedIds.clear();
    // Se recarga siempre: los filtros pudieron cambiar mientras la otra vista estaba arriba y
    // volver a una tabla con datos de otro filtro es peor que esperar la petición.
    this.load();
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.trabajadorOptions = [
          { workerId: null, nombreCompleto: 'Todos los trabajadores' },
          ...data.trabajadores,
        ];
        this.buildAreaCascade(data.areaTree);
        this.periodos = data.periodos ?? [];
        this.periodoOptions = [
          { key: null, label: 'Todos los periodos' },
          ...this.periodos.map((p) => ({ key: this.periodoKey(p.anio, p.mes), label: p.label })),
        ];
        if (this.filters.periodoKey
            && !this.periodos.some((p) => this.periodoKey(p.anio, p.mes) === this.filters.periodoKey)) {
          this.filters.periodoKey = null;
        }
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private periodoKey(anio: number, mes: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  private get periodoSeleccionado(): PeriodoOptionDto | null {
    if (!this.filters.periodoKey) return null;
    return this.periodos.find((p) => this.periodoKey(p.anio, p.mes) === this.filters.periodoKey) ?? null;
  }

  /** Los filtros vigentes en el shape que consumen las dos vistas. */
  get query(): ReembolsoQuery {
    const periodo = this.periodoSeleccionado;
    return {
      workerId:        this.filters.workerId,
      q:               this.searchText,
      estadoReembolso: this.filters.estadoReembolso,
      areaScopeIds:    this.currentAreaScopeIds(),
      periodoAnio:     periodo?.anio ?? null,
      periodoMes:      periodo?.mes ?? null,
    };
  }

  /** Copia estable de los filtros: el seguimiento la recibe como @Input y reacciona al cambio. */
  seguimientoQuery: ReembolsoQuery = {};

  load(): void {
    this.seguimientoQuery = this.query;
    if (this.vista === 'seguimiento') {
      // La vista de seguimiento se recarga sola al cambiar su [query].
      this.cdr.detectChanges();
      return;
    }

    this.loaderService.show();
    this.selectedIds.clear();
    this.pager.reset();
    this.service.getAll(this.query).subscribe({
      next: (res) => {
        this.consolidados = res.data;
        // Las tarjetas se cuentan sobre este mismo conjunto filtrado: llegan con el listado.
        this.resumen = res.resumen;
        this.abrirPendientePorRendicion();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Abre el consolidado que cubre la planilla del enlace viejo. Si no aparece en el listado (los
   * filtros pudieron dejarla fuera) no se fuerza nada: la pantalla queda como está.
   */
  private abrirPendientePorRendicion(): void {
    if (this.rendicionPendiente == null) return;
    const rendicionId = this.rendicionPendiente;
    this.rendicionPendiente = null;

    const fila = this.consolidados.find((c) => c.rendiciones.some((r) => r.id === rendicionId));
    if (fila) this.detalleId = fila.id;
  }

  private recargar(): void {
    this.load();
    this.loadFilterData();
  }

  // ── Filtro de área en cascada ────────────────────────────────────────────

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

  // ── Paginación ───────────────────────────────────────────────────────
  // El listado llega completo (los filtros y la búsqueda ya los aplicó el backend), así que la
  // página se recorta acá. La selección NO se recorta: lo seleccionado sobrevive al cambio de
  // página, que es lo que hace útil el pago masivo de un periodo entero.

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.consolidados);
  }

  get pagedConsolidados(): ReembolsoListItemDto[] {
    return this.pager.page(this.consolidados);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Selección ────────────────────────────────────────────────────────
  // Un consolidado puede estar esperando la revisión de Tesorería o el pago, nunca las dos: por
  // eso la selección es una sola y cada botón actúa sobre la parte que le toca.

  onSelectClick(event: MouseEvent, c: ReembolsoListItemDto): void {
    event.stopPropagation();
    if (this.selectedIds.has(c.id)) this.selectedIds.delete(c.id);
    else                            this.selectedIds.add(c.id);
  }

  /**
   * Devuelto por Tesorería y esperando la subsanación (RG-49). Se pregunta primero que las otras
   * dos: un consolidado observado no está ni por revisar ni por pagar aunque sus contadores de
   * Tesorería queden en cero.
   */
  observado(c: ReembolsoListItemDto): boolean {
    return c.observadasCount > 0;
  }

  /** Espera la revisión documental de Tesorería. */
  porRevisar(c: ReembolsoListItemDto): boolean {
    return !this.observado(c) && c.porConfirmarCount > 0;
  }

  /** Ya revisado y listo para desembolsar. */
  porPagar(c: ReembolsoListItemDto): boolean {
    return !this.observado(c) && c.porConfirmarCount === 0 && c.porPagarCount > 0;
  }

  /**
   * Todo lo que todavía se puede accionar desde acá. Lo ya pagado no se vuelve a tocar, y lo
   * observado tampoco: la pelota la tiene el consolidador hasta que recargue el Consolidado del S10.
   */
  get accionables(): ReembolsoListItemDto[] {
    return this.consolidados.filter((c) => this.porRevisar(c) || this.porPagar(c));
  }

  get allSelected(): boolean {
    return this.accionables.length > 0 && this.accionables.every((c) => this.selectedIds.has(c.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) this.selectedIds.clear();
    else this.selectedIds = new Set(this.accionables.map((c) => c.id));
  }

  get seleccionadosPorRevisar(): ReembolsoListItemDto[] {
    return this.consolidados.filter((c) => this.selectedIds.has(c.id) && this.porRevisar(c));
  }

  get seleccionadosPorPagar(): ReembolsoListItemDto[] {
    return this.consolidados.filter((c) => this.selectedIds.has(c.id) && this.porPagar(c));
  }

  /**
   * Se puede observar tanto lo que está por revisar como lo ya confirmado para pagar (RG-49: "antes
   * de autorizar el pago"), así que la acción toma toda la selección accionable.
   */
  get seleccionadosParaObservar(): ReembolsoListItemDto[] {
    return this.consolidados.filter(
      (c) => this.selectedIds.has(c.id) && (this.porRevisar(c) || this.porPagar(c)),
    );
  }

  get montoSeleccionado(): number {
    return this.seleccionadosPorPagar.reduce((acc, c) => acc + c.montoTotal, 0);
  }

  // ── Acciones ─────────────────────────────────────────────────────────

  /**
   * Paso 1: confirmar que la documentación está completa. No mueve plata — deja los consolidados
   * habilitados para el desembolso, que es el paso siguiente.
   */
  async confirmarRevision(): Promise<void> {
    const items = this.seleccionadosPorRevisar;
    if (items.length === 0) return;

    const salidas = items.reduce((acc, c) => acc + c.porConfirmarCount, 0);

    // Sin preview de correos: confirmar la revisión es un paso interno de Tesorería y no avisa a
    // nadie. Se dice, porque el resto de las acciones del ciclo sí mandan correo.
    const result = await Swal.fire({
      icon: 'question',
      title: items.length === 1
        ? '¿Confirmar la revisión de este consolidado?'
        : `¿Confirmar la revisión de ${items.length} consolidados?`,
      text: `${salidas} salida(s). Quedan habilitadas para el pago. No se avisa a nadie todavía.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar revisión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C2410C',
    });
    if (!result.isConfirmed) return;

    this.ejecutar(this.service.confirmarRevision({ consolidadoIds: items.map((c) => c.id) }));
  }

  /**
   * El camino de vuelta (RG-49). El consolidado no va directo al Coordinador ERP: vuelve al
   * consolidador, que es quien decide si recarga el Consolidado del S10 corregido o le pide al ERP
   * la corrección dentro del S10 con su propio «MOTIVO *» (RG-21). Por eso el texto de la
   * confirmación nombra ese camino en vez de prometer que el ERP ya quedó avisado.
   */
  async observar(): Promise<void> {
    const items = this.seleccionadosParaObservar;
    if (items.length === 0) return;

    const seleccion = { consolidadoIds: items.map((c) => c.id) };
    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: items.length === 1
        ? '¿Observar este reembolso?'
        : `¿Observar ${items.length} consolidados?`,
      nota:
        'Vuelve al consolidador para que recargue el Consolidado del S10 o le pida la corrección ' +
        'al Coordinador ERP. Al recargarlo pasa otra vez por la firma de la jefatura.',
      avisos: await pedirAvisos(this.service.correoPreviewObservacion(seleccion)),
      observacion: {
        label: 'Motivo',
        placeholder: 'Qué tiene que corregirse en el Consolidado del S10…',
      },
      confirmButtonText: 'Observar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.ejecutar(this.service.observar({ ...seleccion, observacion }));
  }

  /** Paso 2: registrar el pago. Cierra el ciclo y le avisa a cada colaborador. */
  async marcarPagadas(): Promise<void> {
    const items = this.seleccionadosPorPagar;
    if (items.length === 0) return;

    const salidas = items.reduce((acc, c) => acc + c.porPagarCount, 0);
    const monto = this.montoSeleccionado.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const seleccion = { consolidadoIds: items.map((c) => c.id) };
    const result = await confirmarConCorreos({
      titulo: items.length === 1
        ? '¿Marcar este consolidado como pagado?'
        : `¿Marcar ${items.length} consolidados como pagados?`,
      nota: `${salidas} salida(s) por S/ ${monto}.`,
      avisos: await pedirAvisos(this.service.correoPreviewPago(seleccion)),
      confirmButtonText: 'Sí, marcar como pagados',
      confirmButtonColor: '#15803D',
    });
    if (!result.isConfirmed) return;

    this.ejecutar(this.service.marcarPagadas(seleccion));
  }

  /** Las tres acciones terminan igual: aviso, recarga y el error a la pantalla. */
  private ejecutar(peticion: Observable<{ message: string }>): void {
    this.loaderService.show();
    peticion.subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success', timer: 1800, showConfirmButton: false });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Detalle ──────────────────────────────────────────────────────────

  abrirDetalle(c: ReembolsoListItemDto): void {
    this.detalleId = c.id;
  }

  cerrarDetalle(recargar = false): void {
    this.detalleId = null;
    if (recargar) this.recargar();
    else this.cdr.detectChanges();
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;
  readonly reembolsoLabelCorto = reembolsoLabelCorto;

  /** "Ana Pérez" o "Ana Pérez +2" — un consolidado puede cubrir a varios. */
  trabajadoresTexto(c: ReembolsoListItemDto): string {
    if (c.trabajadores.length === 0) return '—';
    const [primero, ...resto] = c.trabajadores;
    return resto.length ? `${primero} +${resto.length}` : primero;
  }

  /**
   * Descuadre entre lo que declara el Consolidado del S10 y lo que suman las planillas COMPLETAS
   * que cubre. Se compara documento contra documento —no contra el pedacito que Tesorería tenga
   * accionable— porque el importe del S10 es de todo lo que cubre. Null cuando cuadra o cuando el
   * consolidado es de los viejos, que no traen el monto: ahí no hay nada que afirmar.
   */
  diferenciaS10(c: ReembolsoListItemDto): number | null {
    if (c.montoS10 == null) return null;
    const dif = Math.round((c.montoS10 - c.montoPlanillas) * 100) / 100;
    return dif === 0 ? null : dif;
  }

  /** La firma que se muestra en la fila: la primera, y cuántas más hay. */
  firmaExtra(c: ReembolsoListItemDto): number {
    return Math.max(c.firmas.length - 1, 0);
  }

  firmasTitle(c: ReembolsoListItemDto): string | null {
    if (c.firmas.length === 0) return null;
    return c.firmas.map((f) => f.nombre).join(', ');
  }

  /**
   * Por qué una planilla del consolidado se muestra apagada. Son dos motivos y no se puede
   * distinguir desde la fila: o todavía espera a su jefatura, o un filtro la dejó fuera.
   */
  fueraDeBandejaTitle(codigo: string): string {
    return `${codigo}: el consolidado la cubre, pero no entra en este recorte (espera a su jefatura o la dejaron fuera los filtros)`;
  }

  estadoTitle(c: ReembolsoListItemDto): string | null {
    return c.reembolsoMixto
      ? 'Este consolidado tiene salidas en distinto estado: se muestra la más atrasada.'
      : null;
  }

  /** Por qué una fila no se puede marcar, para el tooltip del checkbox. */
  motivoNoAccionable(c: ReembolsoListItemDto): string | null {
    if (this.porRevisar(c) || this.porPagar(c)) return null;
    if (this.observado(c)) return 'Lo observaste: espera a que vuelvan a adjuntar el Consolidado del S10';
    return 'Ya está pagado';
  }

  /** Lo que devolviste y sigue esperando, para el tooltip del badge. */
  observacionTitle(c: ReembolsoListItemDto): string | null {
    if (!this.observado(c) || !c.observacionReembolso) return this.estadoTitle(c);
    return `Observado por Tesorería: ${c.observacionReembolso}`;
  }
}
