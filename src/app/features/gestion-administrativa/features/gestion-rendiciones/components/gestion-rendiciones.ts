import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { GestionRendicionesService } from '../services/gestion-rendiciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  AreaNodeDto,
  GestionRendicionListItemDto,
  PeriodoOptionDto,
  PlanillaGrupalDto,
  PrimeraRevisionAccionDto,
  ResumenGestionRendicionesDto,
} from '../dtos/gestion-rendicion.dto';
import { primeraRevisionColors, reembolsoColors } from '../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../shared/confirmar-correos';
import { AuthService } from '../../../../../core/services/auth.service';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { ConsolidadoS10Modal } from '../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import {
  ConsolidadoS10Dto,
  otrasRendicionesDelConsolidado,
} from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { nombreConsolidado } from '../../../shared/consolidado-nombre';
import { GestionRendicionDetalleModal } from './gestion-rendicion-detalle-modal/gestion-rendicion-detalle-modal';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

/** Lo que va a cubrir el Consolidado del S10 que se está por adjuntar: una planilla o varias. */
interface ConsolidadoObjetivo {
  rendicionIds: number[];
  codigos: string[];
  /** Suma de los montos completos de esas planillas: lo que tiene que declarar el consolidado. */
  monto: number;
  /** Número de planilla impreso cuando es una sola ("TI: 000123"). */
  referencia: string | null;
  /** Código de la planilla grupal sobre la que se sube: es lo que se registró en el S10. */
  codigoGrupal: string | null;
}

/** "A", "A y B", "A, B y C". */
const enumerar = (partes: string[]): string =>
  partes.length <= 1
    ? (partes[0] ?? '')
    : partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];

/**
 * "Gestión de Rendiciones": las planillas del alcance, su PRIMERA revisión (la jefatura), y la
 * planilla grupal y el Consolidado del S10 que se les adjunta después (solo el consolidador del
 * área, en ese orden: el S10 se sube sobre la planilla grupal). Gestión de Salidas llega hasta
 * rendir; decidir y firmar el reembolso es de Consolidados —lo que se decide ahí es el documento del
 * S10, que puede cubrir varias planillas— y el pago, de Tesorería (Reembolsos).
 *
 * La visibilidad es exactamente la de Gestión de Salidas: son las mismas salidas, agrupadas por
 * planilla, porque la revisión y el consolidado son del documento y no de cada salida.
 */
@Component({
  standalone: true,
  selector: 'app-gestion-rendiciones',
  imports: [
    CommonModule, DatePipe, StatusBadge, SearchSelect, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, AbrilBulkActionDirective, TitleCasePipe,
    ConsolidadoS10Modal, GestionRendicionDetalleModal,
  ],
  templateUrl: './gestion-rendiciones.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    /* Mismas tarjetas que las otras pantallas de salidas: cuentan el conjunto que muestra la
       tabla, así que se mueven con los filtros. */
    .resumen-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
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
    .resumen-card--warn  { border-left-color: var(--color-abril-warning); }
    .resumen-card--warn  .resumen-card__value { color: var(--color-abril-warning-dark); }
    .resumen-card--primary { border-left-color: #005D9D; }
    .resumen-card--primary .resumen-card__value { color: #005D9D; }
    .resumen-card--info  { border-left-color: var(--color-abril-standard); }
    .resumen-card--info  .resumen-card__value { color: var(--color-abril-standard); }
    .resumen-card--ok    { border-left-color: #4338CA; }
    .resumen-card--ok    .resumen-card__value { color: #4338CA; }

    /* Enlaces a los PDF de la fila: son documentos que se abren, no acciones. */
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
    .doc-chip--pendiente { border-style: dashed; color: #9CA3AF; }
  `],
})
export class GestionRendiciones implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();

  rendiciones: GestionRendicionListItemDto[] = [];

  /** IDs de planilla seleccionados para las acciones en bloque. */
  selectedIds = new Set<number>();

  detalleId: number | null = null;
  /** El detalle abierto, para que muestre la planilla grupal apenas se prepara desde su pie. */
  @ViewChild(GestionRendicionDetalleModal) private detalleModal?: GestionRendicionDetalleModal;
  /** Lo que va a cubrir el consolidado cuyo modal está abierto. null = cerrado. */
  consolidadoPara: ConsolidadoObjetivo | null = null;

  resumen: ResumenGestionRendicionesDto = { primeraRevision: 0, sinConsolidado: 0 };

  // ── Filtros ────────────────────────────────────────────────────────
  trabajadorOptions: any[] = [{ workerId: null, nombreCompleto: 'Todos los trabajadores' }];
  periodoOptions: { key: string | null; label: string }[] = [{ key: null, label: 'Todos los periodos' }];
  private periodos: PeriodoOptionDto[] = [];

  /** Razón social del usuario: bajo la que queda el Consolidado del S10 que suba. */
  razonSocialConsolidador: string | null = null;

  readonly estadoPrimeraRevisionOptions = [
    { value: null,                  label: 'Todas' },
    { value: 'En primera revisión', label: 'Por revisar' },
    { value: 'Observada',           label: 'Observadas' },
    { value: 'Aprobada',            label: 'Aprobadas' },
    { value: 'Lista para enviar',   label: 'Sin enviar' },
  ];

  readonly estadoReembolsoOptions = [
    { value: null,        label: 'Todos' },
    { value: 'Pendiente', label: 'Por revisar' },
    { value: 'Observado', label: 'Observadas' },
    { value: 'Aprobado',  label: 'Aprobadas' },
    { value: 'Firmado',   label: 'Firmadas' },
    { value: 'Proceder con el reembolso', label: 'En Tesorería' },
    { value: 'Pagado',    label: 'Pagadas' },
  ];
  readonly consolidadoOptions = [
    { value: null, label: 'Todas' },
    { value: 'no', label: 'Sin consolidado' },
    { value: 'si', label: 'Con consolidado' },
  ];

  filters = {
    workerId:        null as number | null,
    estadoPrimeraRevision: null as string | null,
    estadoReembolso: null as string | null,
    consolidado:     null as string | null,
    periodoKey:      null as string | null,
  };

  filtrosAbiertos = false;

  // ── Filtro de área en cascada (igual al de Gestión de Salidas) ──
  areaLevels: AreaCascadeNode[][] = [];
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.workerId != null)        n++;
    if (this.filters.estadoPrimeraRevision != null) n++;
    if (this.filters.estadoReembolso != null) n++;
    if (this.filters.consolidado != null)     n++;
    if (this.filters.periodoKey != null)      n++;
    if (this.selectedAreaNodes.some((node) => node)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = {
      workerId: null, estadoPrimeraRevision: null, estadoReembolso: null,
      consolidado: null, periodoKey: null,
    };
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.load();
  }

  constructor(
    private service: GestionRendicionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Botón "Configuración" del header ─────────────────────────────────
  // Lleva a la configuración de ESTA pantalla: los correos de las dos decisiones del revisor
  // (primera revisión y reembolso), que no se originan en ningún otro lado. Se restringe con la
  // misma feature que antes protegía la sección Correos: quien no la tiene no ve el botón.

  private static readonly FEATURE_CONFIG_CORREOS = 'gestion-administrativa.config.correos';

  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(GestionRendiciones.FEATURE_CONFIG_CORREOS);
  }

  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }


  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-administrativa/gestion-rendiciones/configuracion']);
  }

  ngOnInit(): void {
    this.loadFilterData();
    this.load();

    // Enlace directo de los correos ("Revisar el reembolso", "Aprobar", "Observar"): abre esa
    // planilla. `accion` la agregan los dos botones del correo de primera revisión y deja el
    // diálogo planteado, pero la decisión se confirma acá — nunca desde el correo.
    const rendicionId = Number(this.route.snapshot.queryParamMap.get('rendicion'));
    if (rendicionId > 0) {
      this.detalleId = rendicionId;
      this.accionPendiente = this.route.snapshot.queryParamMap.get('accion');
    }
  }

  /**
   * Acción que venía en el enlace del correo ("aprobar" | "observar"), a la espera de que el
   * listado cargue. Se resuelve una sola vez: si el revisor cierra el diálogo sin decidir, no
   * vuelve a saltar.
   */
  private accionPendiente: string | null = null;

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.trabajadorOptions = [
          { workerId: null, nombreCompleto: 'Todos los trabajadores' },
          ...data.trabajadores,
        ];
        this.buildAreaCascade(data.areaTree);
        this.razonSocialConsolidador = data.razonSocialConsolidador ?? null;
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

  load(): void {
    this.loaderService.show();
    this.selectedIds.clear();
    const periodo = this.periodoSeleccionado;
    this.service.getAll(
      this.filters.workerId,
      this.filters.estadoPrimeraRevision,
      this.filters.estadoReembolso,
      this.filters.consolidado == null ? null : this.filters.consolidado === 'si',
      this.currentAreaScopeIds(),
      periodo?.anio ?? null,
      periodo?.mes ?? null,
    ).subscribe({
      next: (res) => {
        this.rendiciones = res.data;
        // Las tarjetas se cuentan sobre este mismo conjunto filtrado: llegan con el listado.
        this.resumen = res.resumen;
        this.loaderService.hide();
        this.resolverAccionDelCorreo();
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

  /** area_scope_id del nodo seleccionado más profundo + sus descendientes (o null si "Todas"). */
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

  // ── Selección ────────────────────────────────────────────────────────

  onSelectClick(event: MouseEvent, r: GestionRendicionListItemDto): void {
    event.stopPropagation();
    if (this.selectedIds.has(r.id)) this.selectedIds.delete(r.id);
    else                            this.selectedIds.add(r.id);
  }

  get allSelected(): boolean {
    return this.rendiciones.length > 0 && this.rendiciones.every((r) => this.selectedIds.has(r.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) this.selectedIds.clear();
    else this.selectedIds = new Set(this.rendiciones.map((r) => r.id));
  }

  get seleccionadas(): GestionRendicionListItemDto[] {
    return this.rendiciones.filter((r) => this.selectedIds.has(r.id));
  }

  // ── Primera revisión ─────────────────────────────────────────────────

  /** Seleccionadas que están esperando la primera revisión. */
  get selectedPorPrimeraRevision(): GestionRendicionListItemDto[] {
    return this.seleccionadas.filter((r) => r.porPrimeraRevision);
  }

  /** True si alguna candidata tiene salidas propias que no le toca revisar: el backend las rechaza. */
  get primeraRevisionBloqueada(): boolean {
    return this.selectedPorPrimeraRevision.some((r) => !r.puedeDecidir);
  }

  get puedeDecidirPrimeraRevision(): boolean {
    return this.selectedPorPrimeraRevision.length > 0 && !this.primeraRevisionBloqueada;
  }

  private accionPrimeraRevisionDe(
    items: GestionRendicionListItemDto[], observacion?: string,
  ): PrimeraRevisionAccionDto {
    return { rendicionIds: items.map((r) => r.id), observacion: observacion ?? null };
  }

  /**
   * A quién le van a llegar los avisos de la decisión sobre esta selección. Lo resuelve el backend
   * con el MISMO cálculo que hace el envío (Configuración → Correos), así que la confirmación no
   * promete un correo a alguien que la configuración dejó fuera.
   *
   * Se pide al apretar el botón y no al cargar la pantalla porque depende de qué está seleccionado:
   * los destinatarios principales son los solicitantes de esas planillas.
   */
  private avisos(items: GestionRendicionListItemDto[], aprobar: boolean) {
    return pedirAvisos(this.service.correoPreview({
      rendicionIds: items.map((r) => r.id),
      aprobar,
    }));
  }

  async aprobarPrimeraRevision(items = this.selectedPorPrimeraRevision): Promise<void> {
    if (items.length === 0) return;

    const result = await confirmarConCorreos({
      titulo: items.length === 1
        ? '¿Aprobar la rendición ' + items[0].codigo + '?'
        : '¿Aprobar ' + items.length + ' rendiciones?',
      nota: 'Habilita al consolidador a preparar la planilla grupal.',
      avisos: await this.avisos(items, true),
      confirmButtonText: 'Sí, aprobar',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.aprobarPrimeraRevision(this.accionPrimeraRevisionDe(items)).subscribe({
      next: (res) => this.trasDecisionPrimeraRevision(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  async observarPrimeraRevision(items = this.selectedPorPrimeraRevision): Promise<void> {
    if (items.length === 0) return;

    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: items.length === 1
        ? '¿Observar la rendición ' + items[0].codigo + '?'
        : '¿Observar ' + items.length + ' rendiciones?',
      avisos: await this.avisos(items, false),
      observacion: {
        label: 'Observación',
        placeholder: 'Qué capturas o montos tiene que corregir el trabajador…',
      },
      confirmButtonText: 'Observar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.loaderService.show();
    this.service.observarPrimeraRevision(this.accionPrimeraRevisionDe(items, observacion)).subscribe({
      next: (res) => this.trasDecisionPrimeraRevision(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  /**
   * Igual que `trasAccion`, pero cierra el detalle: decidida la primera revisión ya no hay nada que
   * mirar ahí, y con el enlace del correo el modal queda abierto detrás del diálogo.
   */
  private trasDecisionPrimeraRevision(message: string): void {
    this.detalleId = null;
    this.trasAccion(message);
  }

  /**
   * Abre el diálogo que pedía el botón del correo. No se plantea nada si la planilla ya no está
   * esperando la primera revisión (otro jefe decidió antes) ni si al que abrió el enlace no le
   * toca revisarla —el correo pudo reenviarse, o pudo cambiar el revisor—: la pantalla ya muestra
   * en qué quedó, y mostrarle el diálogo solo lo llevaría al 403 del servidor.
   */
  private resolverAccionDelCorreo(): void {
    const accion = this.accionPendiente;
    if (!accion || this.detalleId === null) return;
    this.accionPendiente = null;

    const planilla = this.rendiciones.find((r) => r.id === this.detalleId);
    if (!planilla?.porPrimeraRevision || !planilla.puedeDecidir) return;

    if (accion === 'aprobar')      void this.aprobarPrimeraRevision([planilla]);
    else if (accion === 'observar') void this.observarPrimeraRevision([planilla]);
  }

  private trasAccion(message: string): void {
    this.loaderService.hide();
    Swal.fire({ title: message, icon: 'success', timer: 1800, showConfirmButton: false });
    this.recargar();
  }

  private errorAccion(err: HttpErrorResponse): void {
    this.loaderService.hide();
    this.errorService.handleError(err);
    this.cdr.detectChanges();
  }

  // ── Detalle ──────────────────────────────────────────────────────────

  abrirDetalle(r: GestionRendicionListItemDto): void {
    this.detalleId = r.id;
  }

  cerrarDetalle(cambio: boolean): void {
    this.detalleId = null;
    if (cambio) this.recargar();
    else        this.cdr.detectChanges();
  }

  // ── Planilla grupal y Consolidado del S10 ────────────────────────────
  // Son dos pasos del consolidador, en este orden: primero prepara la PLANILLA GRUPAL —el papel
  // sin firmar con el que registra las rendiciones en el S10— y después sube el Consolidado del S10
  // que le devuelve el S10, sobre esa misma planilla. La jefatura la firma en Consolidados.
  //
  // Los dos cubren varias rendiciones, incluso de trabajadores y razones sociales distintos, y se
  // piden para toda la selección desde la barra de arriba —o desde el detalle de una planilla, que
  // es la misma acción sobre una sola—, nunca desde la fila: ofrecerlo fila por fila invitaba a
  // armar un documento por planilla cuando lo que corresponde es uno solo. Acá solo se adjunta el
  // PRIMER consolidado: reemplazarlo es de Consolidados. El backend re-valida todo; acá solo se
  // evita ofrecer lo que va a rechazar.

  /**
   * True si el usuario es consolidador de alguna planilla de la tabla. Sin eso los botones de la
   * planilla grupal y del Consolidado del S10 no se muestran: la jefatura revisa, no consolida.
   */
  get esConsolidador(): boolean {
    return this.rendiciones.some((r) => r.puedeConsolidar);
  }

  /** Las planillas grupales (sin repetir) de estas filas. */
  private planillasGrupalesDe(items: GestionRendicionListItemDto[]): PlanillaGrupalDto[] {
    const porId = new Map<number, PlanillaGrupalDto>();
    for (const r of items) if (r.planillaGrupal) porId.set(r.planillaGrupal.id, r.planillaGrupal);
    return [...porId.values()];
  }

  /**
   * "REN-1 ya tiene…" / "REN-1 y REN-2 ya tienen…": el motivo por el que un botón no sirve para la
   * selección, nombrando a las rendiciones que lo tienen.
   */
  private static motivo(
    filas: GestionRendicionListItemDto[], singular: string, plural: string,
  ): string {
    return enumerar(filas.map((r) => r.codigo)) + ' ' + (filas.length === 1 ? singular : plural);
  }

  /**
   * Por qué el usuario no puede hacerle el trámite del S10 a la selección, o null si puede: tiene
   * que ser consolidador de los trabajadores de todas.
   */
  private static sinPermisoDe(items: GestionRendicionListItemDto[]): string | null {
    const sinPermiso = items.filter((r) => !r.puedeConsolidar);
    return sinPermiso.length
      ? 'No eres consolidador de los trabajadores de ' + sinPermiso.map((r) => r.codigo).join(', ')
      : null;
  }

  // ── Planilla grupal ──

  /** Seleccionadas a las que se les puede preparar la planilla grupal. */
  get selectedPreparables(): GestionRendicionListItemDto[] {
    return this.seleccionadas.filter((r) => r.puedePrepararPlanilla);
  }

  /**
   * Por qué no se puede preparar una planilla grupal con la selección, o null si se puede.
   *
   * Tienen que servir TODAS las seleccionadas —no se prepara solo con las que sirven—: una planilla
   * grupal no se rehace ni se reemplaza, así que una que saliera sin alguna de las rendiciones
   * marcadas se quedaría así. Por lo mismo, una rendición que ya tiene planilla grupal (o su
   * consolidado) no activa el botón.
   */
  get planillaSeleccionBloqueo(): string | null {
    const items = this.seleccionadas;
    if (items.length === 0) {
      return 'Selecciona rendiciones con la primera revisión aprobada y sin planilla grupal';
    }

    const conS10 = items.filter((r) => r.consolidadoS10);
    if (conS10.length) {
      return GestionRendiciones.motivo(
        conS10, 'ya tiene su Consolidado del S10', 'ya tienen su Consolidado del S10');
    }
    const conPlanilla = items.filter((r) => r.planillaGrupal);
    if (conPlanilla.length) {
      return GestionRendiciones.motivo(
        conPlanilla, 'ya tiene su planilla grupal', 'ya tienen su planilla grupal');
    }
    const sinAprobar = items.filter((r) => r.estadoPrimeraRevision !== 'Aprobada');
    if (sinAprobar.length) {
      return GestionRendiciones.motivo(
        sinAprobar,
        'todavía no tiene la primera revisión aprobada',
        'todavía no tienen la primera revisión aprobada');
    }
    // Lo que queda (aprobada, sin planilla ni S10, pero con el reembolso ya decidido) solo pasa en
    // registros viejos con un consolidado por salida.
    const otras = items.filter((r) => !r.puedePrepararPlanilla);
    if (otras.length) {
      return GestionRendiciones.motivo(otras, 'no admite planilla grupal', 'no admiten planilla grupal');
    }
    return GestionRendiciones.sinPermisoDe(items);
  }

  prepararPlanillaSeleccion(): void {
    if (this.planillaSeleccionBloqueo !== null) return;
    void this.prepararPlanilla(this.selectedPreparables);
  }

  /** El botón del pie del detalle: la planilla grupal de esa sola rendición. */
  prepararPlanillaDesdeDetalle(d: GestionRendicionListItemDto): void {
    if (!d.puedePrepararPlanilla || !d.puedeConsolidar) return;
    void this.prepararPlanilla([d]);
  }

  /**
   * Prepara UNA planilla grupal para estas rendiciones y les avisa a sus trabajadores que quedaron
   * incluidas. La confirmación nombra a quién le llega el correo —lo resuelve el backend con el
   * mismo cálculo que el envío— y advierte que no se puede rehacer.
   */
  private async prepararPlanilla(items: GestionRendicionListItemDto[]): Promise<void> {
    if (items.length === 0) return;

    const rendicionIds = items.map((r) => r.id);

    const result = await confirmarConCorreos({
      titulo: items.length === 1
        ? '¿Preparar la planilla grupal de ' + items[0].codigo + '?'
        : '¿Preparar una planilla grupal con ' + items.length + ' rendiciones?',
      // Es lo único que no dice ni el título ni la pantalla: la planilla grupal no se rehace.
      nota: 'Una vez preparada, no se puede rehacer.',
      avisos: await pedirAvisos(this.service.correoPreview({
        rendicionIds,
        aprobar: true,
        accion: 'PLANILLA_GRUPAL',
      })),
      // Sin nadie a quien avisar igual se prepara: el aviso es informativo.
      sinNadie: 'La planilla grupal se prepara igual, pero sin aviso por correo: está apagado en Configuración → Correos.',
      confirmButtonText: 'Preparar',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.prepararPlanillaGrupal(rendicionIds).subscribe({
      next: (planilla) => void this.trasPrepararPlanilla(planilla),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  /**
   * La planilla recién preparada se ofrece para abrir en el acto: es el papel que el consolidador
   * tiene que registrar en el S10. La tabla —y el detalle, si se preparó desde ahí— se recargan al
   * cerrar el aviso, para que el loader no tape sus botones.
   */
  private async trasPrepararPlanilla(planilla: PlanillaGrupalDto): Promise<void> {
    this.loaderService.hide();

    const cuantas = planilla.rendiciones.length;
    const result = await Swal.fire({
      icon: 'success',
      title: 'Planilla grupal preparada',
      text: cuantas > 1
        ? `${planilla.codigo} agrupa ${cuantas} rendiciones.`
        : `${planilla.codigo} quedó lista.`,
      showCancelButton: true,
      confirmButtonText: 'Abrir la planilla',
      cancelButtonText: 'Cerrar',
    });
    if (result.isConfirmed) window.open(planilla.pdfUrl, '_blank', 'noopener');

    this.load();
    this.detalleModal?.cargar();
  }

  // ── Consolidado del S10 ──

  /** Seleccionadas a las que se les puede adjuntar el Consolidado del S10: con planilla grupal. */
  get selectedConsolidables(): GestionRendicionListItemDto[] {
    return this.seleccionadas.filter((r) => r.puedeAdjuntarConsolidado);
  }

  /**
   * Por qué no se puede adjuntar un consolidado a la selección, o null si se puede. Solo se pueden
   * seleccionar rendiciones con planilla grupal —de una sola— y sin S10: el consolidado se sube
   * sobre esa planilla, para todas sus rendiciones a la vez.
   */
  get consolidadoSeleccionBloqueo(): string | null {
    const items = this.seleccionadas;
    if (items.length === 0) {
      return 'Selecciona las rendiciones de una planilla grupal';
    }

    const conS10 = items.filter((r) => r.consolidadoS10);
    if (conS10.length) {
      return GestionRendiciones.motivo(
        conS10, 'ya tiene su Consolidado del S10', 'ya tienen su Consolidado del S10');
    }
    const sinPlanilla = items.filter((r) => !r.planillaGrupal);
    if (sinPlanilla.length) {
      return GestionRendiciones.motivo(
        sinPlanilla,
        'todavía no tiene planilla grupal: prepárala primero',
        'todavía no tienen planilla grupal: prepárala primero');
    }
    if (this.planillasGrupalesDe(items).length > 1) {
      return 'Son de planillas grupales distintas: sube un consolidado por planilla grupal';
    }
    const otras = items.filter((r) => !r.puedeAdjuntarConsolidado);
    if (otras.length) {
      return GestionRendiciones.motivo(
        otras, 'no admite el Consolidado del S10', 'no admiten el Consolidado del S10');
    }
    return GestionRendiciones.sinPermisoDe(items);
  }

  /**
   * Cuántas rendiciones cubriría el consolidado de la selección: toda su planilla grupal, aunque no
   * estén todas seleccionadas (o visibles).
   */
  get consolidadoSeleccionCuenta(): number {
    return this.objetivoConsolidado(this.selectedConsolidables).rendicionIds.length;
  }

  abrirConsolidadoSeleccion(): void {
    if (this.consolidadoSeleccionBloqueo !== null) return;
    this.consolidadoPara = this.objetivoConsolidado(this.selectedConsolidables);
  }

  /** El botón del pie del detalle: el consolidado de su planilla grupal entera. */
  abrirConsolidadoDesdeDetalle(d: GestionRendicionListItemDto): void {
    if (!d.puedeAdjuntarConsolidado || !d.puedeConsolidar) return;
    this.consolidadoPara = this.objetivoConsolidado([d]);
  }

  /**
   * Lo que cubriría un consolidado adjuntado a estas filas: la unión de sus conjuntos —su planilla
   * grupal entera— y la suma de sus montos completos, que es lo que el consolidado tiene que
   * declarar.
   */
  private objetivoConsolidado(items: GestionRendicionListItemDto[]): ConsolidadoObjetivo {
    const cubiertas = new Map<number, { codigo: string; monto: number }>();
    for (const r of items) {
      for (const c of r.consolidadoConjunto) {
        cubiertas.set(c.id, { codigo: c.codigo, monto: c.montoTotalPlanilla });
      }
    }

    const unaSola = cubiertas.size === 1 ? items[0] : null;

    return {
      rendicionIds: [...cubiertas.keys()],
      codigos: [...cubiertas.values()].map((c) => c.codigo).sort(),
      monto: [...cubiertas.values()].reduce((acc, c) => acc + c.monto, 0),
      referencia: unaSola
        ? (unaSola.numeroPlanilla
            ?? `Rendición del ${new Date(unaSola.rendidoAt).toLocaleDateString('es-PE')}`)
        : null,
      codigoGrupal: items[0]?.planillaGrupal?.codigo ?? null,
    };
  }

  readonly subirConsolidado = (file: File, montoTotal: number, numeroReembolso: string) =>
    this.service.uploadConsolidadoS10(this.consolidadoPara!.rendicionIds, file, montoTotal, numeroReembolso);

  /**
   * A quién le llega el aviso que dispara adjuntar: la jefatura de los trabajadores de esas
   * planillas. Lo resuelve el backend con el mismo cálculo que hace el envío.
   */
  readonly avisosConsolidado = () =>
    this.service.correoPreview({
      rendicionIds: this.consolidadoPara!.rendicionIds,
      aprobar: true,
      accion: 'CONSOLIDADO_S10',
    });

  cerrarConsolidado(subido: ConsolidadoS10Dto | null): void {
    this.consolidadoPara = null;
    if (subido) {
      // Si se adjuntó desde el detalle, lo que mostraba ya cambió: se cierra con la tabla recargada.
      this.detalleId = null;
      this.recargar();
    } else {
      this.cdr.detectChanges();
    }
  }

  /** Con qué otras rendiciones comparte el consolidado de la fila (vacío si es solo suyo). */
  otrasDelConsolidado(r: GestionRendicionListItemDto): string[] {
    return otrasRendicionesDelConsolidado(r.consolidadoS10, r.id);
  }

  /**
   * Etiqueta del chip del consolidado: el código de la rendición grupal, que es como se la nombra
   * en las otras tres pantallas de su ciclo. Los consolidados anteriores al código se quedan con el
   * "S10 ✓" de siempre: ahí lo único que hay que decir es que el documento está.
   */
  consolidadoChipLabel(r: GestionRendicionListItemDto): string {
    return r.consolidadoS10?.codigo ?? 'S10 ✓';
  }

  /**
   * Título del chip del consolidado: sus dos nombres, el archivo que se abre y con qué rendiciones
   * se comparte. El chip es uno solo —firmado el documento, abre esa copia y la original ya no se
   * ofrece—, así que el título tiene que decir cuál de las dos está enseñando.
   */
  consolidadoChipTitle(r: GestionRendicionListItemDto): string {
    const c = r.consolidadoS10;
    const partes = [nombreConsolidado(c)];

    if (c?.pdfFirmadoUrl) {
      partes.push(c.pdfFirmadoFilename ?? 'copia firmada');
      if (c.firmadoAt) partes.push(`firmado el ${formatDate(c.firmadoAt, 'dd/MM/yyyy HH:mm', 'es-PE')}`);
    } else if (c?.pdfFilename) {
      partes.push(c.pdfFilename);
    }

    const otras = this.otrasDelConsolidado(r);
    if (otras.length) partes.push(`también cubre ${otras.join(', ')}`);

    return partes.join(' · ');
  }

  /** Con qué otras rendiciones comparte la planilla grupal preparada (vacío si es solo suya). */
  otrasDeLaPlanillaGrupal(r: GestionRendicionListItemDto): string[] {
    return (r.planillaGrupal?.rendiciones ?? []).filter((x) => x.id !== r.id).map((x) => x.codigo);
  }

  /**
   * Título del chip de la planilla grupal que todavía espera su S10: su código —el que va a heredar
   * el consolidado—, el archivo, cuándo se preparó y con qué otras rendiciones va.
   */
  planillaGrupalChipTitle(r: GestionRendicionListItemDto): string {
    const g = r.planillaGrupal;
    if (!g) return '';
    const partes = [
      g.codigo,
      g.pdfFilename,
      `preparada el ${formatDate(g.preparadaAt, 'dd/MM/yyyy HH:mm', 'es-PE')}`,
    ];
    const otras = this.otrasDeLaPlanillaGrupal(r);
    if (otras.length) partes.push(`también cubre ${otras.join(', ')}`);
    return partes.join(' · ');
  }

  /** Título del chip «S10 pendiente»: cuál de los dos pasos del consolidador falta. */
  s10PendienteTitle(r: GestionRendicionListItemDto): string {
    if (r.estadoPrimeraRevision !== 'Aprobada') {
      return 'El Consolidado del S10 se habilita al aprobar la primera revisión';
    }
    return r.planillaGrupal
      ? 'Todavía no se sube el Consolidado del S10'
      : 'Todavía no se prepara la planilla grupal';
  }

  /** Título del chip de la planilla: qué copia abre, y desde cuándo está firmada si ya lo está. */
  planillaChipTitle(r: GestionRendicionListItemDto): string {
    if (!r.pdfFirmadoUrl) return r.pdfFilename;
    const nombre = r.pdfFirmadoFilename ?? 'Planilla firmada';
    return r.firmadoAt
      ? `${nombre} · firmada el ${formatDate(r.firmadoAt, 'dd/MM/yyyy HH:mm', 'es-PE')}`
      : nombre;
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;
  readonly primeraRevisionColors = primeraRevisionColors;

  /** Tooltip del badge de la primera revisión: lo que importa es la observación. */
  primeraRevisionTitle(r: GestionRendicionListItemDto): string | null {
    if (r.estadoPrimeraRevision === 'Observada' && r.primeraRevisionObservacion) {
      return 'Observación: ' + r.primeraRevisionObservacion;
    }
    if (r.estadoPrimeraRevision === 'Lista para enviar') {
      return 'El trabajador todavía no la envió a revisión.';
    }
    return null;
  }

  /** El estado ya se llama "Observado" en el backend: el badge lo imprime tal cual. */
  reembolsoTexto(estado: string): string {
    return estado;
  }

  reembolsoTitle(r: GestionRendicionListItemDto): string | null {
    const partes: string[] = [];
    if (r.estadoReembolso === 'Observado' && r.observacionReembolso) {
      const de = r.observacionReembolsoOrigen ? ` de ${r.observacionReembolsoOrigen}` : '';
      partes.push(`Observación${de}: ${r.observacionReembolso}`);
    }
    if (r.reembolsoMixto) {
      partes.push('Las salidas visibles no están todas en el mismo estado: se muestra la más atrasada.');
    }
    return partes.length ? partes.join(' · ') : null;
  }

  /** "Ana Pérez" o "Ana Pérez +2" — la planilla puede agrupar a varios. */
  trabajadoresTexto(r: GestionRendicionListItemDto): string {
    if (r.trabajadores.length === 0) return '—';
    const [primero, ...resto] = r.trabajadores;
    return resto.length ? `${primero} +${resto.length}` : primero;
  }
}
