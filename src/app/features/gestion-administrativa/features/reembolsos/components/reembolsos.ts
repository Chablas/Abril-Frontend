import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { ReembolsosService } from '../services/reembolsos.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  AreaNodeDto,
  PeriodoOptionDto,
  ReembolsoListItemDto,
  ResumenReembolsosDto,
} from '../dtos/reembolso.dto';
import { reembolsoColors } from '../../../shared/dtos/rendicion-shared.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { ReembolsoDetalleModal } from './reembolso-detalle-modal/reembolso-detalle-modal';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

/**
 * "Reembolsos": la bandeja de Tesorería, último paso del ciclo. Muestra las planillas que la
 * jefatura ya firmó —de TODA la organización, porque Tesorería paga a todos— y las ya pagadas,
 * para consulta. Su única acción es marcar como pagado.
 *
 * Antes vivía como un modo dentro de Gestión de Salidas; se separó cuando esa pantalla dejó de
 * llegar hasta el reembolso.
 */
@Component({
  standalone: true,
  selector: 'app-reembolsos',
  imports: [
    CommonModule, DatePipe, StatusBadge, SearchSelect, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, AbrilBulkActionDirective, TitleCasePipe,
    ReembolsoDetalleModal,
  ],
  templateUrl: './reembolsos.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

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
    .resumen-card--pend  { border-left-color: #4338CA; }
    .resumen-card--pend  .resumen-card__value { color: #4338CA; }
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
export class Reembolsos implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();

  planillas: ReembolsoListItemDto[] = [];
  selectedIds = new Set<number>();
  detalleId: number | null = null;

  resumen: ResumenReembolsosDto = { porPagar: 0, montoPorPagar: 0, pagadas: 0 };

  // ── Filtros ────────────────────────────────────────────────────────
  trabajadorOptions: any[] = [{ workerId: null, nombreCompleto: 'Todos los trabajadores' }];
  periodoOptions: { key: string | null; label: string }[] = [{ key: null, label: 'Todos los periodos' }];
  private periodos: PeriodoOptionDto[] = [];

  /** Tesorería solo ve Firmadas y Pagadas: el backend recorta igual, ofrecer otro estado sería un filtro vacío. */
  readonly estadoOptions = [
    { value: null,      label: 'Firmadas y pagadas' },
    { value: 'Firmado', label: 'Solo firmadas' },
    { value: 'Pagado',  label: 'Solo pagadas' },
  ];

  filters = {
    workerId:        null as number | null,
    estadoReembolso: null as string | null,
    periodoKey:      null as string | null,
  };

  filtrosAbiertos = false;

  areaLevels: AreaCascadeNode[][] = [];
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.workerId != null)        n++;
    if (this.filters.estadoReembolso != null) n++;
    if (this.filters.periodoKey != null)      n++;
    if (this.selectedAreaNodes.some((node) => node)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = { workerId: null, estadoReembolso: null, periodoKey: null };
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.load();
  }

  constructor(
    private service: ReembolsosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFilterData();
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

  load(): void {
    this.loaderService.show();
    this.selectedIds.clear();
    const periodo = this.periodoSeleccionado;
    this.service.getAll(
      this.filters.workerId,
      this.filters.estadoReembolso,
      this.currentAreaScopeIds(),
      periodo?.anio ?? null,
      periodo?.mes ?? null,
    ).subscribe({
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

  // ── Selección ────────────────────────────────────────────────────────

  onSelectClick(event: MouseEvent, r: ReembolsoListItemDto): void {
    event.stopPropagation();
    if (this.selectedIds.has(r.id)) this.selectedIds.delete(r.id);
    else                            this.selectedIds.add(r.id);
  }

  /** Solo se marcan las que tienen algo por pagar: las ya pagadas no vuelven a pagarse. */
  get pagables(): ReembolsoListItemDto[] {
    return this.planillas.filter((r) => r.porPagarCount > 0);
  }

  get allSelected(): boolean {
    return this.pagables.length > 0 && this.pagables.every((r) => this.selectedIds.has(r.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) this.selectedIds.clear();
    else this.selectedIds = new Set(this.pagables.map((r) => r.id));
  }

  get selectedPagables(): ReembolsoListItemDto[] {
    return this.planillas.filter((r) => this.selectedIds.has(r.id) && r.porPagarCount > 0);
  }

  get montoSeleccionado(): number {
    return this.selectedPagables.reduce((acc, r) => acc + r.montoTotal, 0);
  }

  // ── Acción ───────────────────────────────────────────────────────────

  async marcarPagadas(): Promise<void> {
    const items = this.selectedPagables;
    if (items.length === 0) return;

    const salidas = items.reduce((acc, r) => acc + r.porPagarCount, 0);
    const monto = this.montoSeleccionado.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const result = await Swal.fire({
      icon: 'question',
      title: items.length === 1 ? '¿Marcar esta planilla como pagada?' : `¿Marcar ${items.length} planillas como pagadas?`,
      text: `${salidas} salida(s) por S/ ${monto}. Esta acción cierra el reembolso.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como pagadas',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#15803D',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.marcarPagadas({ rendicionIds: items.map((r) => r.id), solicitudIds: [] }).subscribe({
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

  cerrarDetalle(): void {
    this.detalleId = null;
    this.cdr.detectChanges();
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;

  /** "Ana Pérez" o "Ana Pérez +2" — la planilla puede agrupar a varios. */
  trabajadoresTexto(r: ReembolsoListItemDto): string {
    if (r.trabajadores.length === 0) return '—';
    const [primero, ...resto] = r.trabajadores;
    return resto.length ? `${primero} +${resto.length}` : primero;
  }

  estadoTitle(r: ReembolsoListItemDto): string | null {
    return r.reembolsoMixto
      ? 'Esta planilla tiene salidas firmadas y pagadas: se muestra la más atrasada.'
      : null;
  }
}
