import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { CorreccionesS10Service } from '../services/correcciones-s10.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  CorreccionS10ListItemDto,
  PeriodoCorreccionOptionDto,
  ResumenCorreccionesS10Dto,
  TrabajadorOptionDto,
} from '../dtos/correccion-s10.dto';
import { correccionS10Colors } from '../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../shared/confirmar-correos';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { CorreccionS10DetalleModal } from './correccion-s10-detalle-modal/correccion-s10-detalle-modal';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';

/**
 * "Correcciones S10": la bandeja del Coordinador ERP, el paso del medio de la subsanación
 * (§10.5 del requerimiento).
 *
 * Cuando la jefatura observa un reembolso, el colaborador tiene dos caminos: arreglar el S10 él
 * mismo y recargar el Consolidado, o pedirle la corrección al ERP cuando el arreglo está dentro
 * del S10, donde no tiene permiso. Esta pantalla es ese segundo camino visto del otro lado.
 *
 * La corrección se ejecuta EN EL S10, fuera de Abril One (§2.1). Acá solo se marca el check que le
 * devuelve la pelota al colaborador, y ese check es lo único que la pantalla escribe.
 *
 * Sin recorte por área: el responsable ERP es uno para toda la organización, igual que Tesorería.
 */
@Component({
  standalone: true,
  selector: 'app-correcciones-s10',
  imports: [
    CommonModule, DatePipe, StatusBadge, SearchSelect, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, AbrilBulkActionDirective, TitleCasePipe,
    SearchInput, Paginator, CorreccionS10DetalleModal,
  ],
  templateUrl: './correcciones-s10.html',
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
    .resumen-card--pend  { border-left-color: #C2410C; }
    .resumen-card--pend  .resumen-card__value { color: #C2410C; }
    .resumen-card--lista { border-left-color: #1D4ED8; }
    .resumen-card--lista .resumen-card__value { color: #1D4ED8; }

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

    /* El motivo es lo único que el ERP tiene que leer para saber qué hacer, así que se muestra
       entero en la fila (recortado a dos líneas) y no escondido detrás de un tooltip. */
    .motivo-celda {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 340px;
      white-space: normal;
      line-height: 1.35;
    }
  `],
})
export class CorreccionesS10 implements OnInit, OnDestroy {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();

  correcciones: CorreccionS10ListItemDto[] = [];
  resumen: ResumenCorreccionesS10Dto = { porAtender: 0, porRecargar: 0 };

  /** id de la corrección cuyo modal de detalle está abierto. null = cerrado. */
  detalleId: number | null = null;

  /** Seleccionadas para el check masivo. */
  selectedIds = new Set<number>();

  // ── Filtros ──────────────────────────────────────────────────────────
  readonly estadoOptions = [
    { value: null, label: 'Todas' },
    { value: 'Pendiente de corrección S10', label: 'Por atender' },
    { value: 'Pendiente de recarga S10', label: 'Ya atendidas' },
  ];

  trabajadorOptions: TrabajadorOptionDto[] = [];
  periodos: PeriodoCorreccionOptionDto[] = [];
  periodoOptions: { key: string | null; label: string }[] = [];

  filters: {
    estado: string | null;
    workerId: number | null;
    periodoKey: string | null;
  } = { estado: null, workerId: null, periodoKey: null };

  searchText = '';
  private readonly searchChange$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  filtrosAbiertos = false;

  private readonly pager = new ClientPager<CorreccionS10ListItemDto>();

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.filters.estado != null) n++;
    if (this.filters.workerId != null) n++;
    if (this.filters.periodoKey != null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.filters = { estado: null, workerId: null, periodoKey: null };
    this.load();
  }

  constructor(
    private service: CorreccionesS10Service,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Botón "Configuración" del header ─────────────────────────────────
  // Lleva a la configuración de ESTA pantalla: el único correo que se origina acá es el aviso al
  // colaborador de que la corrección ya está hecha.

  private static readonly FEATURE_CONFIG_CORREOS = 'gestion-administrativa.config.correos';

  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(CorreccionesS10.FEATURE_CONFIG_CORREOS);
  }

  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-administrativa/correcciones-s10/configuracion']);
  }

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load());

    this.loadFilterData();
    this.load();

    // Enlace directo del correo al ERP: abre esa corrección sin buscarla en la tabla.
    const correccionId = Number(this.route.snapshot.queryParamMap.get('correccion'));
    if (correccionId > 0) this.detalleId = correccionId;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(): void {
    this.searchChange$.next();
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.trabajadorOptions = [...data.trabajadores]
          .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
        this.periodos = data.periodos ?? [];
        this.periodoOptions = [
          { key: null, label: 'Todos los periodos' },
          ...this.periodos.map((p) => ({ key: this.periodoKey(p.anio, p.mes), label: p.label })),
        ];
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private periodoKey(anio: number, mes: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  private get periodoSeleccionado(): PeriodoCorreccionOptionDto | null {
    if (!this.filters.periodoKey) return null;
    return this.periodos.find((p) => this.periodoKey(p.anio, p.mes) === this.filters.periodoKey)
        ?? null;
  }

  load(): void {
    this.loaderService.show();
    this.selectedIds.clear();
    this.pager.reset();

    const periodo = this.periodoSeleccionado;
    this.service.getAll(
      this.filters.estado,
      this.filters.workerId,
      this.searchText,
      periodo?.anio ?? null,
      periodo?.mes ?? null,
    ).subscribe({
      next: (res) => {
        this.correcciones = res.data;
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

  // ── Detalle ──────────────────────────────────────────────────────────

  abrirDetalle(c: CorreccionS10ListItemDto): void {
    this.detalleId = c.id;
  }

  cerrarDetalle(huboCambios: boolean): void {
    this.detalleId = null;
    if (huboCambios) this.recargar();
    else this.cdr.detectChanges();
  }

  // ── Selección ────────────────────────────────────────────────────────
  // Solo se seleccionan las que están por atender: las ya atendidas esperan al colaborador y no
  // hay nada que el ERP pueda hacerles.

  esSeleccionable(c: CorreccionS10ListItemDto): boolean {
    return c.porAtender;
  }

  onSelectClick(event: MouseEvent, c: CorreccionS10ListItemDto): void {
    event.stopPropagation();
    if (!this.esSeleccionable(c)) return;
    if (this.selectedIds.has(c.id)) this.selectedIds.delete(c.id);
    else this.selectedIds.add(c.id);
  }

  get seleccionables(): CorreccionS10ListItemDto[] {
    return this.correcciones.filter((c) => this.esSeleccionable(c));
  }

  get allSelected(): boolean {
    const s = this.seleccionables;
    return s.length > 0 && s.every((c) => this.selectedIds.has(c.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedIds.clear();
      return;
    }
    this.selectedIds = new Set(this.seleccionables.map((c) => c.id));
  }

  get selectedPorAtender(): CorreccionS10ListItemDto[] {
    return this.correcciones.filter((c) => this.selectedIds.has(c.id) && c.porAtender);
  }

  // ── El check de atención ─────────────────────────────────────────────

  /** Desde la tabla, sobre la selección. */
  atenderBulk(): Promise<void> {
    return this.atender(this.selectedPorAtender);
  }

  /** Desde el botón de una fila. */
  atenderUna(c: CorreccionS10ListItemDto, ev: Event): Promise<void> {
    ev.stopPropagation();
    return this.atender([c]);
  }

  /**
   * Marca la corrección como hecha en el S10 y le avisa al colaborador. Se pregunta aparte si el
   * registro se ANULÓ, porque eso cambia lo que él tiene que hacer después: con una anulación
   * necesita una guía nueva y la anterior queda bloqueada al recargar el consolidado.
   */
  private async atender(items: CorreccionS10ListItemDto[]): Promise<void> {
    if (items.length === 0) return;

    const ids = items.map((c) => c.id);
    const guias = items
      .map((c) => c.numeroGuia)
      .filter((g): g is string => !!g);

    const { value, isConfirmed } = await Swal.fire<{ anulada: boolean; comentario: string }>({
      icon: 'question',
      title: items.length === 1
        ? '¿Marcar como atendida?'
        : `¿Marcar ${items.length} correcciones como atendidas?`,
      html: `
        <div style="text-align:left;color:#4B5563">
          <label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;margin-bottom:10px">
            <input type="checkbox" id="ga-guia-anulada" style="margin-top:3px;accent-color:#C2410C">
            <span>
              El registro del S10 se <b>anuló</b>: hace falta una guía nueva.
              ${guias.length ? `<br><span style="font-size:12px;color:#6B7280">Guía actual: ${guias.join(', ')}</span>` : ''}
            </span>
          </label>
          <label for="ga-comentario" style="display:block;font-size:13px;margin-bottom:4px">
            Comentario (opcional)
          </label>
          <textarea id="ga-comentario" class="swal2-textarea" style="margin:0;width:100%"
                    placeholder="Qué hiciste en el S10…"></textarea>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como atendida',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
      preConfirm: () => ({
        anulada: (document.getElementById('ga-guia-anulada') as HTMLInputElement)?.checked ?? false,
        comentario: (document.getElementById('ga-comentario') as HTMLTextAreaElement)?.value ?? '',
      }),
    });
    if (!isConfirmed || !value) return;

    // El preview va DESPUÉS del formulario y no antes: el diálogo ya pide dos datos, y meter
    // además la lista de correos ahí lo volvía ilegible. Acá es una confirmación de una línea.
    const avisos = await pedirAvisos(this.service.correoPreview(ids));
    const { isConfirmed: confirmado } = await confirmarConCorreos({
      titulo: 'Confirmar',
      avisos,
      sinNadie: 'Se marca igual, pero sin aviso por correo: está apagado en Configuración → Correos.',
      confirmButtonText: 'Confirmar',
    });
    if (!confirmado) return;

    this.loaderService.show();
    this.service.atender({
      correccionIds: ids,
      comentarioAtencion: value.comentario?.trim() || null,
      guiaAnulada: value.anulada,
    }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message, timer: 2600, showConfirmButton: false });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Paginación ───────────────────────────────────────────────────────
  // El listado llega completo (los filtros ya los aplicó el backend), así que la página se recorta
  // acá.

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.correcciones);
  }

  get pagedCorrecciones(): CorreccionS10ListItemDto[] {
    return this.pager.page(this.correcciones);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Colores de estado ────────────────────────────────────────────────

  readonly correccionS10Colors = correccionS10Colors;
}
