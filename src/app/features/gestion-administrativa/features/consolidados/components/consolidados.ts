import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { ConsolidadosService } from '../services/consolidados.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  AreaNodeDto,
  ConsolidadoAccionDto,
  ConsolidadoListItemDto,
  PeriodoOptionDto,
  ResumenConsolidadosDto,
} from '../dtos/consolidado.dto';
import { reembolsoColors, reembolsoLabelCorto } from '../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../shared/confirmar-correos';
import { AuthService } from '../../../../../core/services/auth.service';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { FirmaRegistrarModal } from '../../../../../shared/components/firma-personal/registrar-modal/firma-registrar-modal';
import { ConsolidadoDetalleModal } from './consolidado-detalle-modal/consolidado-detalle-modal';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

/**
 * "Consolidados": los Consolidados del S10 del alcance de la jefatura y la decisión del reembolso
 * sobre cada uno (aprobar —que ES firmar— u observar).
 *
 * Es su propia pantalla y no una parte de Gestión de Rendiciones porque lo que se decide es el
 * DOCUMENTO del S10: uno solo puede cubrir varias planillas, de uno o de varios trabajadores, y
 * decidirlas por separado dejaba al trabajador con un reembolso partido y al jefe firmando el mismo
 * PDF varias veces. Gestión de Rendiciones llega hasta adjuntar el consolidado; el pago es de
 * Tesorería y vive en Reembolsos.
 */
@Component({
  standalone: true,
  selector: 'app-consolidados',
  imports: [
    CommonModule, DatePipe, StatusBadge, SearchSelect, SearchInput, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, AbrilBulkActionDirective, TitleCasePipe,
    FirmaRegistrarModal, ConsolidadoDetalleModal,
  ],
  templateUrl: './consolidados.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    /* Mismas tarjetas que las otras pantallas del flujo: cuentan el conjunto que muestra la
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
    .resumen-card--primary { border-left-color: #005D9D; }
    .resumen-card--primary .resumen-card__value { color: #005D9D; }
    .resumen-card--warn  { border-left-color: var(--color-abril-warning); }
    .resumen-card--warn  .resumen-card__value { color: var(--color-abril-warning-dark); }
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

    /* Código de una planilla cubierta. Las que el usuario no ve van apagadas: se listan porque el
       importe declarado las incluye, pero no puede abrirlas ni decidir sobre ellas. */
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
    .ren-chip--ajena { background: #F3F4F6; color: #9CA3AF; }
  `],
})
export class Consolidados implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();

  consolidados: ConsolidadoListItemDto[] = [];

  /** IDs de consolidado seleccionados para las acciones en bloque. */
  selectedIds = new Set<number>();

  detalleId: number | null = null;

  /** Modal para registrar la firma en el momento (se abre con el 409 de aprobar). */
  firmaModalAbierto = false;
  /** Selección que se estaba firmando cuando saltó el modal, para reintentarla al guardarla. */
  private accionPendienteDeFirma: ConsolidadoAccionDto | null = null;

  resumen: ResumenConsolidadosDto = { porDecidir: 0, observados: 0, firmados: 0 };

  // ── Filtros ────────────────────────────────────────────────────────
  trabajadorOptions: any[] = [{ workerId: null, nombreCompleto: 'Todos los trabajadores' }];
  periodoOptions: { key: string | null; label: string }[] = [{ key: null, label: 'Todos los periodos' }];
  private periodos: PeriodoOptionDto[] = [];

  readonly estadoReembolsoOptions = [
    { value: null,        label: 'Todos' },
    { value: 'Pendiente', label: 'Por decidir' },
    { value: 'Observado', label: 'Observados' },
    { value: 'Firmado',   label: 'Firmados' },
    { value: 'Proceder con el reembolso', label: 'En Tesorería' },
    { value: 'Pagado',    label: 'Pagados' },
  ];

  filters = {
    workerId:        null as number | null,
    estadoReembolso: null as string | null,
    texto:           '',
    periodoKey:      null as string | null,
  };

  filtrosAbiertos = false;

  // ── Filtro de área en cascada (igual al de Gestión de Rendiciones) ──
  areaLevels: AreaCascadeNode[][] = [];
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.workerId != null)        n++;
    if (this.filters.estadoReembolso != null) n++;
    if (this.filters.texto.trim())            n++;
    if (this.filters.periodoKey != null)      n++;
    if (this.selectedAreaNodes.some((node) => node)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = { workerId: null, estadoReembolso: null, texto: '', periodoKey: null };
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.load();
  }

  constructor(
    private service: ConsolidadosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Botón "Configuración" del header ─────────────────────────────────
  // Lleva a la configuración de ESTA pantalla: los correos de la decisión del reembolso, la
  // visibilidad de la bandeja y los consolidadores por área. Se restringe con la misma feature
  // que protege la sección Correos: quien no la tiene no ve el botón.

  private static readonly FEATURE_CONFIG_CORREOS = 'gestion-administrativa.config.correos';

  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(Consolidados.FEATURE_CONFIG_CORREOS);
  }

  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-administrativa/consolidados/configuracion']);
  }

  ngOnInit(): void {
    this.loadFilterData();
    this.load();

    // Enlace directo de los correos: abre ese consolidado.
    const consolidadoId = Number(this.route.snapshot.queryParamMap.get('consolidado'));
    if (consolidadoId > 0) this.detalleId = consolidadoId;
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
      this.filters.texto,
      this.currentAreaScopeIds(),
      periodo?.anio ?? null,
      periodo?.mes ?? null,
    ).subscribe({
      next: (res) => {
        this.consolidados = res.data;
        // Las tarjetas se cuentan sobre este mismo conjunto filtrado: llegan con el listado.
        this.resumen = res.resumen;
        this.loaderService.hide();
        this.cdr.detectChanges();
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

  /**
   * El texto se busca en el servidor —igual que el resto de los filtros, para que las tarjetas
   * cuenten lo mismo que la tabla— pero con una espera: sin ella cada tecla sería una petición.
   */
  private textoTimer: ReturnType<typeof setTimeout> | null = null;

  onTextoChange(valor: string): void {
    this.filters.texto = valor;
    if (this.textoTimer) clearTimeout(this.textoTimer);
    this.textoTimer = setTimeout(() => this.load(), 400);
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

  onSelectClick(event: MouseEvent, c: ConsolidadoListItemDto): void {
    event.stopPropagation();
    if (this.selectedIds.has(c.id)) this.selectedIds.delete(c.id);
    else                            this.selectedIds.add(c.id);
  }

  get allSelected(): boolean {
    return this.consolidados.length > 0 && this.consolidados.every((c) => this.selectedIds.has(c.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) this.selectedIds.clear();
    else this.selectedIds = new Set(this.consolidados.map((c) => c.id));
  }

  get seleccionados(): ConsolidadoListItemDto[] {
    return this.consolidados.filter((c) => this.selectedIds.has(c.id));
  }

  /** Seleccionados con algún reembolso por decidir. */
  get selectedPorDecidir(): ConsolidadoListItemDto[] {
    return this.seleccionados.filter((c) => c.porDecidirCount > 0);
  }

  /**
   * True si algún candidato cubre salidas propias que no le toca decidir: el backend las rechaza.
   * Lo decide el backend por consolidado (`puedeDecidir`), que solo deja pasar las propias cuando
   * el usuario es su propio revisor (jefe personalizado apuntándose a sí mismo).
   */
  get decisionBloqueada(): boolean {
    return this.selectedPorDecidir.some((c) => !c.puedeDecidir);
  }

  get puedeDecidir(): boolean {
    return this.selectedPorDecidir.length > 0 && !this.decisionBloqueada;
  }

  private accionDe(items: ConsolidadoListItemDto[], observacion?: string): ConsolidadoAccionDto {
    return { consolidadoIds: items.map((c) => c.id), observacion: observacion ?? null };
  }

  /**
   * A quién le van a llegar los avisos de la decisión sobre esta selección. Lo resuelve el backend
   * con el MISMO cálculo que hace el envío (Configuración → Correos), así que la confirmación no
   * promete un correo a alguien que la configuración dejó fuera.
   *
   * Se pide al apretar el botón y no al cargar la pantalla porque depende de qué está seleccionado:
   * los destinatarios principales son los dueños de esas salidas.
   */
  private avisos(items: ConsolidadoListItemDto[], aprobar: boolean) {
    return pedirAvisos(this.service.correoPreview({
      consolidadoIds: items.map((c) => c.id),
      aprobar,
    }));
  }

  // ── Acciones ─────────────────────────────────────────────────────────

  async aprobarBulk(items = this.selectedPorDecidir): Promise<void> {
    if (items.length === 0) return;

    const salidas = items.reduce((acc, c) => acc + c.porDecidirCount, 0);
    const result = await confirmarConCorreos({
      titulo: items.length === 1
        ? '¿Aprobar el reembolso de ' + this.referencia(items[0]) + '?'
        : `¿Aprobar ${items.length} consolidados?`,
      // El conteo no está en la tabla —un consolidado cubre varias salidas— y la firma es el
      // efecto que no se ve.
      nota: `${salidas} salida(s). Se firma el Consolidado del S10 y las planillas que cubre.`,
      avisos: await this.avisos(items, true),
      confirmButtonText: 'Sí, aprobar',
    });
    if (!result.isConfirmed) return;

    // Aprobar firma: si el revisor no tiene firma registrada, el 409 abre el modal para dibujarla.
    this.aprobar(this.accionDe(items));
  }

  async observarBulk(items = this.selectedPorDecidir): Promise<void> {
    if (items.length === 0) return;

    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: items.length === 1
        ? '¿Observar el reembolso de ' + this.referencia(items[0]) + '?'
        : `¿Observar ${items.length} consolidados?`,
      avisos: await this.avisos(items, false),
      observacion: {
        label: 'Observación',
        placeholder: 'Qué tiene que corregir el trabajador en el Consolidado del S10…',
      },
      confirmButtonText: 'Observar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.loaderService.show();
    this.service.observarReembolso(this.accionDe(items, observacion)).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  /**
   * Ejecuta la aprobación, que ES la firma: estampa la firma de la jefatura en el consolidado y en
   * las planillas que cubre. El 409 significa que todavía no registró su firma — en vez de mandarlo
   * a Configuración se abre el modal donde la dibuja y la acción se reintenta sola.
   */
  private aprobar(accion: ConsolidadoAccionDto): void {
    this.loaderService.show();
    this.service.aprobarReembolso(accion).subscribe({
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
    if (accion) this.aprobar(accion);
  }

  cerrarFirmaModal(): void {
    this.firmaModalAbierto = false;
    this.accionPendienteDeFirma = null;
    this.cdr.detectChanges();
  }

  private trasAccion(message: string): void {
    this.loaderService.hide();
    this.detalleId = null;
    Swal.fire({ title: message, icon: 'success', timer: 1800, showConfirmButton: false });
    this.recargar();
  }

  private errorAccion(err: HttpErrorResponse): void {
    this.loaderService.hide();
    this.errorService.handleError(err);
    this.cdr.detectChanges();
  }

  // ── Detalle ──────────────────────────────────────────────────────────

  abrirDetalle(c: ConsolidadoListItemDto): void {
    this.detalleId = c.id;
  }

  cerrarDetalle(cambio: boolean): void {
    this.detalleId = null;
    if (cambio) this.recargar();
    else        this.cdr.detectChanges();
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;
  readonly reembolsoLabelCorto = reembolsoLabelCorto;

  /** Cómo se nombra un consolidado en los diálogos: por su número de reembolso del S10. */
  referencia(c: ConsolidadoListItemDto): string {
    return c.numeroReembolso ? 'N.° ' + c.numeroReembolso : 'este consolidado';
  }

  /** "Ana Pérez" o "Ana Pérez +2" — un consolidado puede cubrir a varios. */
  trabajadoresTexto(c: ConsolidadoListItemDto): string {
    if (c.trabajadores.length === 0) return '—';
    const [primero, ...resto] = c.trabajadores;
    return resto.length ? `${primero} +${resto.length}` : primero;
  }

  reembolsoTitle(c: ConsolidadoListItemDto): string | null {
    const partes: string[] = [];
    if (c.estadoReembolso === 'Observado' && c.observacionReembolso) {
      const de = c.observacionReembolsoOrigen ? ` de ${c.observacionReembolsoOrigen}` : '';
      partes.push(`Observación${de}: ${c.observacionReembolso}`);
    }
    if (c.reembolsoMixto) {
      partes.push('Las salidas visibles no están todas en el mismo estado: se muestra la más atrasada.');
    }
    return partes.length ? partes.join(' · ') : null;
  }

  /** Planillas que el usuario no ve: se listan por el monto, pero no puede entrar en ellas. */
  ajenaTitle(codigo: string): string {
    return `${codigo} no está en tu alcance: se lista porque el importe del consolidado la incluye.`;
  }
}
