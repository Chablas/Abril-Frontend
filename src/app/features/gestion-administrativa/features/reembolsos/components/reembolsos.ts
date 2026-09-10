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
 * "Reembolsos": la bandeja de Tesorería, último paso del ciclo. Muestra las planillas que la
 * jefatura ya firmó —de TODA la organización, porque Tesorería paga a todos— y son DOS pasos, no
 * uno (RG-26): primero se confirma la revisión documental (planilla, Consolidado del S10, firma y
 * tramos con sus vouchers) y recién entonces se puede pagar.
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

  planillas: ReembolsoListItemDto[] = [];
  selectedIds = new Set<number>();
  detalleId: number | null = null;

  resumen: ResumenReembolsosDto = { porRevisar: 0, porPagar: 0, montoPorPagar: 0, pagadas: 0 };

  // ── Filtros ────────────────────────────────────────────────────────
  trabajadorOptions: any[] = [{ workerId: null, nombreCompleto: 'Todos los trabajadores' }];
  periodoOptions: { key: string | null; label: string }[] = [{ key: null, label: 'Todos los periodos' }];
  private periodos: PeriodoOptionDto[] = [];

  /** Tesorería solo ve estos tres estados: el backend recorta igual, ofrecer otro sería un filtro vacío. */
  readonly estadoOptions = [
    { value: null,                        label: 'Todos los estados' },
    { value: 'Firmado',                   label: 'Firmadas · por revisar' },
    { value: 'Proceder con el reembolso', label: 'Por pagar' },
    { value: 'Pagado',                    label: 'Pagadas' },
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

    this.loadFilterData();
    this.load();

    // Enlace directo del correo "Reembolso por pagar": abre esa planilla.
    const rendicionId = Number(this.route.snapshot.queryParamMap.get('rendicion'));
    if (rendicionId > 0) this.detalleId = rendicionId;
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
        this.planillas = res.data;
        // Las tarjetas se cuentan sobre este mismo conjunto filtrado: llegan con el listado.
        this.resumen = res.resumen;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
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
    return this.pager.totalPages(this.planillas);
  }

  get pagedPlanillas(): ReembolsoListItemDto[] {
    return this.pager.page(this.planillas);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Selección ────────────────────────────────────────────────────────
  // Una planilla puede estar esperando la revisión de Tesorería o el pago, nunca las dos: por eso
  // la selección es una sola y cada botón actúa sobre la parte que le toca.

  onSelectClick(event: MouseEvent, r: ReembolsoListItemDto): void {
    event.stopPropagation();
    if (this.selectedIds.has(r.id)) this.selectedIds.delete(r.id);
    else                            this.selectedIds.add(r.id);
  }

  /** Espera la revisión documental de Tesorería. */
  porRevisar(r: ReembolsoListItemDto): boolean {
    return r.porConfirmarCount > 0;
  }

  /** Ya revisada y lista para desembolsar. */
  porPagar(r: ReembolsoListItemDto): boolean {
    return r.porConfirmarCount === 0 && r.porPagarCount > 0;
  }

  /** Todo lo que todavía tiene algo por hacer: lo ya pagado no se vuelve a tocar. */
  get accionables(): ReembolsoListItemDto[] {
    return this.planillas.filter((r) => this.porRevisar(r) || this.porPagar(r));
  }

  get allSelected(): boolean {
    return this.accionables.length > 0 && this.accionables.every((r) => this.selectedIds.has(r.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) this.selectedIds.clear();
    else this.selectedIds = new Set(this.accionables.map((r) => r.id));
  }

  get seleccionadasPorRevisar(): ReembolsoListItemDto[] {
    return this.planillas.filter((r) => this.selectedIds.has(r.id) && this.porRevisar(r));
  }

  get seleccionadasPorPagar(): ReembolsoListItemDto[] {
    return this.planillas.filter((r) => this.selectedIds.has(r.id) && this.porPagar(r));
  }

  get montoSeleccionado(): number {
    return this.seleccionadasPorPagar.reduce((acc, r) => acc + r.montoTotal, 0);
  }

  // ── Acciones ─────────────────────────────────────────────────────────

  /**
   * Paso 1: confirmar que la documentación está completa. No mueve plata — deja las planillas
   * habilitadas para el desembolso, que es el paso siguiente.
   */
  async confirmarRevision(): Promise<void> {
    const items = this.seleccionadasPorRevisar;
    if (items.length === 0) return;

    const salidas = items.reduce((acc, r) => acc + r.porConfirmarCount, 0);

    // Sin preview de correos: confirmar la revisión es un paso interno de Tesorería y no avisa a
    // nadie. Se dice, porque el resto de las acciones del ciclo sí mandan correo.
    const result = await Swal.fire({
      icon: 'question',
      title: items.length === 1
        ? '¿Confirmar la revisión de esta planilla?'
        : `¿Confirmar la revisión de ${items.length} planillas?`,
      text: `${salidas} salida(s). Quedan habilitadas para el pago. No se avisa a nadie todavía.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar revisión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C2410C',
    });
    if (!result.isConfirmed) return;

    this.ejecutar(
      this.service.confirmarRevision({ rendicionIds: items.map((r) => r.id), solicitudIds: [] }),
    );
  }

  /** Paso 2: registrar el pago. Cierra el ciclo y le avisa a cada colaborador. */
  async marcarPagadas(): Promise<void> {
    const items = this.seleccionadasPorPagar;
    if (items.length === 0) return;

    const salidas = items.reduce((acc, r) => acc + r.porPagarCount, 0);
    const monto = this.montoSeleccionado.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const seleccion = { rendicionIds: items.map((r) => r.id), solicitudIds: [] };
    const result = await confirmarConCorreos({
      titulo: items.length === 1 ? '¿Marcar esta planilla como pagada?' : `¿Marcar ${items.length} planillas como pagadas?`,
      nota: `${salidas} salida(s) por S/ ${monto}.`,
      avisos: await pedirAvisos(this.service.correoPreviewPago(seleccion)),
      confirmButtonText: 'Sí, marcar como pagadas',
      confirmButtonColor: '#15803D',
    });
    if (!result.isConfirmed) return;

    this.ejecutar(this.service.marcarPagadas(seleccion));
  }

  /** Las dos acciones terminan igual: aviso, recarga y el error a la pantalla. */
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

  abrirDetalle(r: ReembolsoListItemDto): void {
    this.detalleId = r.id;
  }

  cerrarDetalle(recargar = false): void {
    this.detalleId = null;
    if (recargar) this.recargar();
    else this.cdr.detectChanges();
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;
  readonly reembolsoLabelCorto = reembolsoLabelCorto;

  /** "Ana Pérez" o "Ana Pérez +2" — la planilla puede agrupar a varios. */
  trabajadoresTexto(r: ReembolsoListItemDto): string {
    if (r.trabajadores.length === 0) return '—';
    const [primero, ...resto] = r.trabajadores;
    return resto.length ? `${primero} +${resto.length}` : primero;
  }

  estadoTitle(r: ReembolsoListItemDto): string | null {
    return r.reembolsoMixto
      ? 'Esta planilla tiene salidas en distinto estado: se muestra la más atrasada.'
      : null;
  }

  /** Por qué una fila no se puede marcar, para el tooltip del checkbox. */
  motivoNoAccionable(r: ReembolsoListItemDto): string | null {
    if (this.porRevisar(r) || this.porPagar(r)) return null;
    return 'Ya está pagada';
  }
}
