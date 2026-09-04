import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { GestionRendicionesService } from '../services/gestion-rendiciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  AreaNodeDto,
  GestionRendicionListItemDto,
  PeriodoOptionDto,
  ReembolsoAccionDto,
  ResumenGestionRendicionesDto,
} from '../dtos/gestion-rendicion.dto';
import { reembolsoColors } from '../../../shared/dtos/rendicion-shared.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { ConsolidadoS10Modal } from '../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { FirmaRegistrarModal } from '../../../../../shared/components/firma-personal/registrar-modal/firma-registrar-modal';
import { GestionRendicionDetalleModal } from './gestion-rendicion-detalle-modal/gestion-rendicion-detalle-modal';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

/**
 * "Gestión de Rendiciones": las planillas del alcance del revisor y todo lo que va DESDE el
 * Consolidado del S10 en adelante — adjuntarlo, decidir el reembolso y firmar la planilla.
 * Gestión de Salidas llega hasta rendir; el pago es de Tesorería y vive en Reembolsos.
 *
 * La visibilidad es exactamente la de Gestión de Salidas: son las mismas salidas, agrupadas por
 * planilla, porque el consolidado y la firma son del documento y no de cada salida.
 */
@Component({
  standalone: true,
  selector: 'app-gestion-rendiciones',
  imports: [
    CommonModule, DatePipe, StatusBadge, SearchSelect, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, AbrilBulkActionDirective, TitleCasePipe,
    ConsolidadoS10Modal, FirmaRegistrarModal, GestionRendicionDetalleModal,
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
  consolidadoDe: GestionRendicionListItemDto | null = null;

  /** Modal para registrar la firma en el momento (se abre con el 409 de firmar). */
  firmaModalAbierto = false;
  /** Selección que se estaba firmando cuando saltó el modal, para reintentar al guardarla. */
  private accionPendienteDeFirma: ReembolsoAccionDto | null = null;

  resumen: ResumenGestionRendicionesDto = { sinConsolidado: 0, porRevisar: 0, porFirmar: 0 };

  // ── Filtros ────────────────────────────────────────────────────────
  trabajadorOptions: any[] = [{ workerId: null, nombreCompleto: 'Todos los trabajadores' }];
  periodoOptions: { key: string | null; label: string }[] = [{ key: null, label: 'Todos los periodos' }];
  private periodos: PeriodoOptionDto[] = [];

  readonly estadoReembolsoOptions = [
    { value: null,        label: 'Todos' },
    { value: 'Pendiente', label: 'Por revisar' },
    { value: 'Rechazado', label: 'Observadas' },
    { value: 'Aprobado',  label: 'Aprobadas' },
    { value: 'Firmado',   label: 'Firmadas' },
    { value: 'Pagado',    label: 'Pagadas' },
  ];
  readonly consolidadoOptions = [
    { value: null, label: 'Todas' },
    { value: 'no', label: 'Sin consolidado' },
    { value: 'si', label: 'Con consolidado' },
  ];

  filters = {
    workerId:        null as number | null,
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
    if (this.filters.estadoReembolso != null) n++;
    if (this.filters.consolidado != null)     n++;
    if (this.filters.periodoKey != null)      n++;
    if (this.selectedAreaNodes.some((node) => node)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = { workerId: null, estadoReembolso: null, consolidado: null, periodoKey: null };
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.load();
  }

  constructor(
    private service: GestionRendicionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFilterData();
    this.load();

    // Enlace directo del correo al revisor ("Revisar el reembolso"): abre esa planilla.
    const rendicionId = Number(this.route.snapshot.queryParamMap.get('rendicion'));
    if (rendicionId > 0) this.detalleId = rendicionId;
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

  load(): void {
    this.loaderService.show();
    this.selectedIds.clear();
    const periodo = this.periodoSeleccionado;
    this.service.getAll(
      this.filters.workerId,
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

  /** Seleccionadas con algún reembolso por decidir. */
  get selectedPorDecidir(): GestionRendicionListItemDto[] {
    return this.seleccionadas.filter((r) => r.porDecidirCount > 0);
  }

  /** True si alguna candidata a decidir incluye salidas propias: el backend las rechaza. */
  get decisionIncluyePropias(): boolean {
    return this.selectedPorDecidir.some((r) => r.incluyePropias);
  }

  get puedeDecidir(): boolean {
    return this.selectedPorDecidir.length > 0 && !this.decisionIncluyePropias;
  }

  /** Seleccionadas con reembolso aprobado esperando firma. */
  get selectedPorFirmar(): GestionRendicionListItemDto[] {
    return this.seleccionadas.filter((r) => r.porFirmarCount > 0);
  }

  private accionDe(items: GestionRendicionListItemDto[], observacion?: string): ReembolsoAccionDto {
    return { rendicionIds: items.map((r) => r.id), solicitudIds: [], observacion: observacion ?? null };
  }

  // ── Acciones ─────────────────────────────────────────────────────────

  async aprobarBulk(): Promise<void> {
    const items = this.selectedPorDecidir;
    if (items.length === 0) return;

    const salidas = items.reduce((acc, r) => acc + r.porDecidirCount, 0);
    const result = await Swal.fire({
      icon: 'question',
      title: items.length === 1 ? '¿Aprobar este reembolso?' : `¿Aprobar ${items.length} planillas?`,
      text: `Se aprobarán ${salidas} salida(s) y se les avisará a sus solicitantes.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.aprobarReembolso(this.accionDe(items)).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  async rechazarBulk(): Promise<void> {
    const items = this.selectedPorDecidir;
    if (items.length === 0) return;

    const { value: observacion, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: items.length === 1 ? '¿Rechazar este reembolso?' : `¿Rechazar ${items.length} planillas?`,
      input: 'textarea',
      inputLabel: 'Observación',
      inputPlaceholder: 'Qué tiene que corregir el trabajador…',
      inputValidator: (v) => (v && v.trim() ? null : 'La observación es obligatoria'),
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.loaderService.show();
    this.service.rechazarReembolso(this.accionDe(items, observacion)).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  async firmarBulk(): Promise<void> {
    const items = this.selectedPorFirmar;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: items.length === 1 ? '¿Firmar esta planilla?' : `¿Firmar ${items.length} planillas?`,
      text: 'Se estampará tu firma sobre una copia; el PDF original se conserva.',
      showCancelButton: true,
      confirmButtonText: 'Sí, firmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0086A5',
    });
    if (!result.isConfirmed) return;

    this.firmar(this.accionDe(items));
  }

  /**
   * Ejecuta la firma. El 409 significa que el usuario todavía no registró su firma: en vez de
   * mandarlo a Configuración se abre el modal donde la dibuja y la acción se reintenta sola.
   */
  private firmar(accion: ReembolsoAccionDto): void {
    this.loaderService.show();
    this.service.firmar(accion).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        if (err.status === 409) {
          this.accionPendienteDeFirma = accion;
          this.firmaModalAbierto = true;
          this.cdr.detectChanges();
          return;
        }
        this.errorAccion(err);
      },
    });
  }

  onFirmaRegistrada(): void {
    this.firmaModalAbierto = false;
    const accion = this.accionPendienteDeFirma;
    this.accionPendienteDeFirma = null;
    if (accion) this.firmar(accion);
  }

  cerrarFirmaModal(): void {
    this.firmaModalAbierto = false;
    this.accionPendienteDeFirma = null;
    this.cdr.detectChanges();
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

  // ── Consolidado del S10 ──────────────────────────────────────────────

  abrirConsolidado(r: GestionRendicionListItemDto, ev: Event): void {
    ev.stopPropagation();
    this.consolidadoDe = r;
  }

  readonly subirConsolidado = (file: File) =>
    this.service.uploadConsolidadoS10(this.consolidadoDe!.id, file);

  get consolidadoReferencia(): string | null {
    const r = this.consolidadoDe;
    if (!r) return null;
    return r.numeroPlanilla ?? `Rendición del ${new Date(r.rendidoAt).toLocaleDateString('es-PE')}`;
  }

  cerrarConsolidado(subido: ConsolidadoS10Dto | null): void {
    this.consolidadoDe = null;
    if (subido) this.recargar();
    else        this.cdr.detectChanges();
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;

  /** El badge dice "Observado" y no "Rechazado": describe en qué quedó la planilla. */
  reembolsoTexto(estado: string): string {
    return estado === 'Rechazado' ? 'Observado' : estado;
  }

  reembolsoTitle(r: GestionRendicionListItemDto): string | null {
    const partes: string[] = [];
    if (r.estadoReembolso === 'Rechazado' && r.observacionReembolso) {
      partes.push(`Observación: ${r.observacionReembolso}`);
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
