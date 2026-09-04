import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { SolicitudSalidaCreate } from './create/create';
import { SolicitudSalidasService } from '../services/solicitud-salidas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudSalidaListItemDto } from '../dtos/solicitud-salida-list-item.dto';
import {
  MesRendicionDto,
  ResumenRendicionDto,
} from '../dtos/solicitud-salida-filter-data.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SolicitudSalidaDetalleModal } from './solicitud-salida-detalle-modal/solicitud-salida-detalle-modal';
import { SolicitudSalidaCapturasModal } from './solicitud-salida-capturas-modal/solicitud-salida-capturas-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../shared/components/fab-button/fab-button';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { ConsolidadoS10Modal } from '../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import {
  ConsolidadoS10Ambito,
  ConsolidadoS10Dto,
} from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';
@Component({
  standalone: true,
  selector: 'app-solicitud-salidas',
  imports: [CommonModule, DatePipe, SolicitudSalidaCreate, StatusBadge, SolicitudSalidaDetalleModal, SolicitudSalidaCapturasModal, SearchSelect, AbrilPageHeaderComponent, FabButton, TitleCasePipe, FilterTriggerButton, FilterModal, AbrilBulkActionDirective, ConsolidadoS10Modal],
  templateUrl: './solicitud-salidas.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    /* ── Tarjetas de resumen + barra "Mes a rendir" ─────────────────────────
       Mismo lenguaje visual que Gestión de Salidas: las tarjetas son la bandeja pendiente del
       trabajador (no el resultado del filtro) y la barra concentra todo lo de la rendición, que
       es un eje aparte de las demás acciones. */
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
    .resumen-card--ok    { border-left-color: var(--color-abril-standard); }
    .resumen-card--ok    .resumen-card__value { color: var(--color-abril-standard); }
    .resumen-card--warn  { border-left-color: var(--color-abril-warning); }
    .resumen-card--warn  .resumen-card__value { color: var(--color-abril-warning-dark); }
    .resumen-card--alert { border-left-color: var(--color-abril-danger); }
    .resumen-card--alert .resumen-card__value { color: var(--color-abril-danger-dark); }

    /* Va en blanco (y no tintada) porque el label flotante de app-search-select corta el borde
       con un fondo blanco fijo: sobre un fondo de color se vería el recorte. */
    .rendicion-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 8px 14px 10px;
      border: 1px solid var(--color-abril-standard-border);
      border-left: 3px solid var(--color-abril-standard);
      border-radius: var(--radius-md);
      background: #FFFFFF;
    }
    .rendicion-bar__select { width: 200px; }
    .rendicion-bar__estado { font-size: 12px; color: var(--color-abril-body); }
    .rendicion-bar__estado strong { color: var(--color-abril-standard); }
    .rendicion-bar__todas {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-abril-body);
      cursor: pointer;
      user-select: none;
    }
    .rendicion-bar__todas input { accent-color: var(--color-abril-standard); cursor: pointer; }
    .rendicion-bar__todas input:disabled { cursor: not-allowed; }
  `],
})
export class SolicitudSalidas implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();
  solicitudes: SolicitudSalidaListItemDto[] = [];
  showModal = false;
  /** true cuando el formulario se abrió desde el atajo del boletín (?nuevo=1) → pantalla completa. */
  modalFullScreen = false;

  /** ID de la solicitud cuyo modal de detalle (read-only) está abierto. null = cerrado. */
  detalleId: number | null = null;

  /** ID de la solicitud cuyo modal de subir capturas está abierto. null = cerrado. */
  capturasId: number | null = null;

  /** Solicitud cuyo modal de Consolidado del S10 está abierto. null = cerrado. */
  consolidadoDe: SolicitudSalidaListItemDto | null = null;

  /** IDs seleccionados para la acción bulk de rendición. */
  selectedIds = new Set<number>();
  /** Índice de la última fila clickeada (ancla para la selección por rango con Shift). */
  private lastClickedIndex: number | null = null;

  // ── Filtros ────────────────────────────────────────────────────────
  lugarProyectoOptions: any[] = [];
  readonly estadoAprobacionOptions = [
    { value: null,        label: 'Todas' },
    { value: 'Pendiente', label: 'Pendientes' },
    { value: 'Aprobado',  label: 'Aprobadas' },
    { value: 'Rechazado', label: 'Rechazadas' },
    { value: 'Cancelado', label: 'Canceladas' },
  ];
  readonly estadoRendicionOptions = [
    { value: null,         label: 'Todas' },
    { value: 'No rendido', label: 'No rendidas' },
    { value: 'Rendido',    label: 'Rendidas' },
  ];
  filters = {
    lugarProyectoId:  null as number | null,
    estadoAprobacion: null as string | null,
    estadoRendicion:  null as string | null,
  };

  /** Modal de filtros (mismo patrón que Gestión de Salidas). */
  filtrosAbiertos = false;

  // ── Periodo de rendición ("Mes a rendir") ────────────────────────────
  /** Meses ofrecidos por el desplegable, con su cantidad de aptas (los arma el backend). */
  mesesRendicion: MesRendicionDto[] = [];

  /** Opciones del `app-search-select` del periodo: la clave es "AAAA-MM". */
  mesOptions: { key: string | null; label: string }[] = [];

  /**
   * Periodo elegido ("AAAA-MM") o null = apagado, que es como arranca. Al prenderlo la tabla
   * muestra SOLO lo apto para rendir de ese mes.
   */
  mesRendirKey: string | null = null;

  /**
   * "Seleccionar todas las del mes": la selección deja de ser la lista de ids visibles y pasa a
   * ser el periodo completo, que resuelve el servidor.
   */
  todoElMes = false;

  /** Números de las tarjetas del encabezado. */
  resumen: ResumenRendicionDto = { aptasParaRendir: 0, capturasIncompletas: 0, observadas: 0 };

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.lugarProyectoId != null)  n++;
    if (this.filters.estadoAprobacion != null) n++;
    if (this.filters.estadoRendicion != null)  n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = { lugarProyectoId: null, estadoAprobacion: null, estadoRendicion: null };
    this.onSearch();
  }

  constructor(
    private service: SolicitudSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFilterData();
    this.load();
    // Atajo desde el boletín (?nuevo=1): abre el formulario directo, sin pasos extra.
    if (this.route.snapshot.queryParamMap.get('nuevo') === '1') {
      this.showModal = true;
      this.modalFullScreen = true;
    }

    // Enlace directo de los correos del reembolso ("Ver mi solicitud" / "Subsanar observaciones"):
    // abre el detalle de esa solicitud sin que el trabajador tenga que buscarla en la tabla.
    const solicitudId = Number(this.route.snapshot.queryParamMap.get('solicitud'));
    if (solicitudId > 0) this.detalleId = solicitudId;
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.lugarProyectoOptions = [
          { id: null, nombreDisplay: 'Todos los proyectos' },
          ...[...data.lugaresProyecto].sort((a, b) => a.nombreDisplay.localeCompare(b.nombreDisplay)),
        ];
        this.aplicarPeriodos(data.mesesRendicion ?? [], data.resumen);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Periodo de rendición ("Mes a rendir") ───────────────────────────────

  /**
   * Guarda los meses y las tarjetas que devolvió el backend. Si el periodo elegido ya no existe
   * (se rindió todo ese mes) se apaga solo: dejarlo puesto mostraría una tabla vacía sin decir
   * por qué.
   */
  private aplicarPeriodos(meses: MesRendicionDto[], resumen: ResumenRendicionDto | undefined): void {
    this.mesesRendicion = meses;
    this.mesOptions = [
      { key: null, label: 'Sin filtrar por mes' },
      ...meses.map((m) => ({ key: this.mesKey(m.anio, m.mes), label: m.label })),
    ];
    this.resumen = resumen ?? { aptasParaRendir: 0, capturasIncompletas: 0, observadas: 0 };

    if (this.mesRendirKey && !meses.some((m) => this.mesKey(m.anio, m.mes) === this.mesRendirKey)) {
      this.mesRendirKey = null;
      this.todoElMes = false;
    }
    this.cdr.detectChanges();
  }

  private mesKey(anio: number, mes: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  /** Periodo elegido, o null si el desplegable está apagado. */
  get mesSeleccionado(): MesRendicionDto | null {
    if (!this.mesRendirKey) return null;
    return this.mesesRendicion.find((m) => this.mesKey(m.anio, m.mes) === this.mesRendirKey) ?? null;
  }

  /** Cambio del periodo: descarta la selección anterior, que era de otro conjunto de filas. */
  onMesRendirChange(key: string | null): void {
    this.mesRendirKey = key || null;
    this.onSearch();
  }

  load(): void {
    this.loaderService.show();
    this.selectedIds.clear();
    this.lastClickedIndex = null;
    this.service.getMySolicitudes(
      this.filters.lugarProyectoId,
      this.filters.estadoAprobacion,
      this.filters.estadoRendicion,
      this.mesSeleccionado?.anio ?? null,
      this.mesSeleccionado?.mes ?? null,
    ).subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Cualquier cambio de filtro suelta la selección del mes: ya no es el mismo conjunto. */
  onSearch(): void {
    this.todoElMes = false;
    this.load();
  }

  /**
   * Recarga la tabla y los números del encabezado. Se usa después de cada acción que mueve el
   * estado (rendir, cancelar, adjuntar el S10): las tarjetas y el desplegable de mes salen de
   * `filter-data`, así que sin esto seguirían mostrando el conteo de antes de la acción.
   */
  private recargar(): void {
    this.load();
    this.loadFilterData();
  }

  onSaved(): void {
    this.showModal = false;
    this.recargar();
  }

  abrirDetalle(s: SolicitudSalidaListItemDto): void {
    this.detalleId = s.id;
  }

  cerrarDetalle(): void {
    this.detalleId = null;
  }

  // ── Selección de filas (estilo Outlook: click abre detalle, shift+click selecciona) ──

  /**
   * Solo se rinde lo apto: aprobada, no rendida, con TODOS los trayectos cubiertos y con un motivo
   * marcado como reembolsable en Configuración → Motivos. Lo resuelve el backend en `aptaParaRendir`
   * para que la pantalla, el desplegable de mes y las tarjetas no puedan discrepar.
   */
  esSeleccionable(s: SolicitudSalidaListItemDto): boolean {
    return s.aptaParaRendir;
  }

  /** Click sobre una fila: con Shift selecciona (o rango); sin Shift abre el detalle. */
  onRowClick(event: MouseEvent, index: number): void {
    if (event.shiftKey) {
      if (typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
      this.onSelectClick(event, index);
      return;
    }
    this.abrirDetalle(this.solicitudes[index]);
  }

  /**
   * Click sobre la casilla de una fila. Con Shift selecciona todo el rango entre la última
   * fila clickeada y la actual (como en Outlook); sin Shift alterna solo esa fila.
   */
  onSelectClick(event: MouseEvent, index: number): void {
    event.stopPropagation();

    // Volver a elegir fila por fila cancela "todas las del mes": son dos formas distintas de
    // seleccionar y mantener las dos a la vez haría que el conteo mienta.
    this.todoElMes = false;

    const clickeada = this.solicitudes[index];

    // Una planilla de rendición es de UN SOLO MES. Si la fila es de otro mes que el que ya está
    // seleccionado, la selección arranca de cero con esta fila en vez de bloquear el clic.
    if (this.mesDeSeleccion && this.mesDeFecha(clickeada.fechaSalida) !== this.mesDeSeleccion) {
      this.selectedIds.clear();
      this.selectedIds.add(clickeada.id);
      this.lastClickedIndex = index;
      return;
    }

    if (event.shiftKey && this.lastClickedIndex !== null) {
      const [desde, hasta] = [this.lastClickedIndex, index].sort((a, b) => a - b);
      const mesAncla = this.mesDeFecha(this.solicitudes[this.lastClickedIndex].fechaSalida);
      for (let k = desde; k <= hasta; k++) {
        // El rango se recorta al mes del ancla: un Shift+clic que cruza meses no puede colar
        // filas de otro periodo en la selección.
        if (this.mesDeFecha(this.solicitudes[k].fechaSalida) === mesAncla) {
          this.selectedIds.add(this.solicitudes[k].id);
        }
      }
      return; // el ancla se mantiene
    }

    const id = clickeada.id;
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else                          this.selectedIds.add(id);
    this.lastClickedIndex = index;
  }

  /** "AAAA-MM" de una fecha de salida ("YYYY-MM-DD"), para comparar periodos sin parsear fechas. */
  private mesDeFecha(fechaSalida: string): string {
    return fechaSalida.substring(0, 7);
  }

  /** Periodo ("AAAA-MM") al que pertenece la selección por filas, o null si no hay nada elegido. */
  get mesDeSeleccion(): string | null {
    const primera = this.solicitudes.find((s) => this.selectedIds.has(s.id));
    return primera ? this.mesDeFecha(primera.fechaSalida) : null;
  }

  private filasDelMes(mes: string): SolicitudSalidaListItemDto[] {
    return this.solicitudes.filter((s) => this.mesDeFecha(s.fechaSalida) === mes);
  }

  /**
   * "Todo seleccionado" se mide contra el mes de la selección, no contra la tabla entera: la lista
   * mezcla meses y una planilla es de uno solo, así que marcar la casilla de la cabecera nunca
   * puede dejar una selección que el backend vaya a rechazar.
   */
  get allSelected(): boolean {
    if (this.todoElMes) return this.solicitudes.length > 0;
    const mes = this.mesDeSeleccion;
    if (!mes) return false;
    return this.filasDelMes(mes).every((s) => this.selectedIds.has(s.id));
  }

  /**
   * Si la fila entra en la selección actual. Con "todas del mes" marcado entran todas las que la
   * tabla está mostrando (el filtro ya dejó solo lo apto de ese periodo), aunque sus ids no estén
   * en `selectedIds` — esa selección la resuelve el servidor.
   */
  filaSeleccionada(s: SolicitudSalidaListItemDto): boolean {
    return this.todoElMes || this.selectedIds.has(s.id);
  }

  /**
   * Casilla de la cabecera: selecciona (o suelta) las filas del mes ya seleccionado; sin selección
   * previa toma el mes de la primera fila. Con el filtro de mes puesto la tabla es de un solo
   * periodo y esto equivale a "seleccionar todo".
   */
  toggleSelectAll(): void {
    this.todoElMes = false;
    if (this.allSelected) {
      this.selectedIds.clear();
      this.lastClickedIndex = null;
      return;
    }

    const mes = this.mesDeSeleccion
      ?? (this.solicitudes.length ? this.mesDeFecha(this.solicitudes[0].fechaSalida) : null);
    if (!mes) return;

    this.selectedIds = new Set(this.filasDelMes(mes).map((s) => s.id));
    this.lastClickedIndex = null;
  }

  /**
   * "Seleccionar todas las del mes": pasa de la selección por ids a una selección por periodo que
   * ejecuta el servidor. Solo tiene sentido con un mes elegido, porque ahí la tabla ya muestra
   * únicamente lo apto para rendir.
   */
  toggleTodoElMes(): void {
    if (!this.mesRendirKey) return;
    this.todoElMes = !this.todoElMes;
    if (this.todoElMes) {
      this.selectedIds.clear();
      this.lastClickedIndex = null;
    }
  }

  /** Cuántos registros abarca la selección actual, sea cual sea la forma en que se hizo. */
  get seleccionadasCount(): number {
    return this.todoElMes ? this.solicitudes.length : this.selectedIds.size;
  }

  /** Cuántos de los seleccionados se van a rendir realmente. */
  get rendiblesCount(): number {
    return this.todoElMes ? this.solicitudes.length : this.selectedRendibles.length;
  }

  /**
   * Texto del indicador de selección de la barra de rendición. Nombra el periodo cuando la
   * selección viene de filas sueltas: como una planilla es de un solo mes, saber cuál está en
   * juego es parte de lo que el trabajador tiene que ver antes de rendir.
   */
  get seleccionResumen(): string {
    if (this.todoElMes) {
      const mes = this.mesSeleccionado?.label ?? 'el mes';
      return `Seleccionadas todas las de ${mes}: ${this.solicitudes.length}`;
    }
    if (this.selectedIds.size === 0) return 'Sin solicitudes seleccionadas';

    const n = this.selectedIds.size;
    const listas = this.selectedRendibles.length;
    const periodo = this.mesRendirKey ? '' : ` de ${this.etiquetaDeMes(this.mesDeSeleccion)}`;
    const base = `${n} seleccionada${n === 1 ? '' : 's'}${periodo}`;
    return listas === n ? base : `${base} · ${listas} lista${listas === 1 ? '' : 's'} para rendir`;
  }

  /** "AAAA-MM" → "Agosto 2026". Cae al nombre calculado si el mes no está en el catálogo. */
  private etiquetaDeMes(clave: string | null): string {
    if (!clave) return 'ese mes';
    const mes = this.mesesRendicion.find((m) => this.mesKey(m.anio, m.mes) === clave);
    if (mes) return mes.label;
    const nombre = new Date(`${clave}-01T00:00:00`).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric',
    });
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  }

  get selectedSolicitudes(): SolicitudSalidaListItemDto[] {
    return this.solicitudes.filter((s) => this.selectedIds.has(s.id));
  }

  /** Seleccionadas que pueden rendirse (aplican a "Rendir"). */
  get selectedRendibles(): SolicitudSalidaListItemDto[] {
    return this.selectedSolicitudes.filter((s) => this.esSeleccionable(s));
  }

  /** Seleccionadas que se pueden cancelar: solo las que siguen Pendientes (todas son propias aquí). */
  get selectedCancelables(): SolicitudSalidaListItemDto[] {
    return this.selectedSolicitudes.filter((s) => s.estadoAprobacion === 'Pendiente');
  }

  /** Cancela en bloque las solicitudes pendientes seleccionadas. */
  async cancelarBulk(): Promise<void> {
    const items = this.selectedCancelables;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: items.length === 1 ? '¿Cancelar esta solicitud?' : `¿Cancelar ${items.length} solicitudes?`,
      text: 'Se anularán tus solicitudes pendientes seleccionadas. Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#D30000',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    forkJoin(items.map((s) => this.service.cancelar(s.id))).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: `${items.length} solicitud(es) cancelada(s)`, icon: 'success', timer: 1500, showConfirmButton: false });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Acción bulk: rendir + descargar planilla ─────────────────────────
  /**
   * Rinde lo seleccionado. Hay dos caminos según cómo se hizo la selección, y por eso es un solo
   * botón y no dos: por ids cuando se eligieron filas, y por periodo cuando está marcado "todas
   * las del mes", donde el conjunto lo resuelve el servidor.
   */
  rendirBulk(): Promise<void> {
    if (this.todoElMes) return this.rendirTodoElMes();
    return this.rendir(this.selectedRendibles.map((s) => s.id));
  }

  /** Rinde una sola solicitud desde el botón "Rendir" de la columna de acciones. */
  rendirUna(s: SolicitudSalidaListItemDto, ev: Event): Promise<void> {
    ev.stopPropagation(); // no abrir el modal de detalle
    return this.rendir([s.id]);
  }

  /** Confirma, marca como rendidas las solicitudes indicadas y descarga la planilla. */
  private async rendir(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: ids.length === 1 ? '¿Rendir esta solicitud?' : `¿Rendir ${ids.length} solicitudes?`,
      text: 'Se marcará como rendida y se descargará tu planilla de gasto por movilidad.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rendir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0086A5',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.marcarRendidasBulk(ids).subscribe({
      next: (response) => this.descargarPlanilla(response, ids.length),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Rinde TODAS las salidas propias aptas del periodo elegido. El backend resuelve qué entra
   * (aprobadas, no rendidas, con sus trayectos cubiertos y con motivo reembolsable) e ignora el
   * resto, así que no depende de lo que esté cargado en la tabla.
   */
  private async rendirTodoElMes(): Promise<void> {
    const mes = this.mesSeleccionado;
    if (!mes) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Rendir tus salidas de ${mes.label}?`,
      text: 'Entran todas las salidas del mes que estén aptas para rendir.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rendir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0086A5',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.rendirMes(mes.anio, mes.mes).subscribe({
      next: (response) => this.descargarPlanilla(response),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Descarga el PDF devuelto por una rendición y refresca la tabla. */
  private descargarPlanilla(response: HttpResponse<Blob>, countFallback = 0): void {
    // Lo que se acaba de rendir ya no está pendiente: la selección del mes deja de tener sentido
    // y quedaría marcada sobre un conjunto distinto al que el usuario aceptó.
    this.todoElMes = false;

    const blob = response.body as Blob;
    const count = Number(response.headers.get('X-Rendidas-Count') ?? countFallback);
    const filename = this.extractFilename(response.headers.get('Content-Disposition'))
                  ?? `Planilla_Rendicion_${new Date().toISOString().slice(0, 10)}.pdf`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    this.loaderService.hide();
    Swal.fire({
      title: `${count} solicitud(es) rendida(s)`,
      text: 'Se descargó la planilla de gasto por movilidad.',
      icon: 'success',
    });
    this.recargar();
  }

  // ── Consolidado del S10 (solo salidas rendidas) ──────────────────────

  /** El consolidado solo aplica cuando la salida ya fue rendida. */
  puedeAdjuntarConsolidado(s: SolicitudSalidaListItemDto): boolean {
    return s.estadoRendicion === 'Rendido';
  }

  abrirConsolidado(s: SolicitudSalidaListItemDto, ev: Event): void {
    ev.stopPropagation(); // no abrir el modal de detalle
    this.consolidadoDe = s;
  }

  /** Función de subida que consume el modal compartido (ya sabe a qué endpoint pegarle). */
  readonly subirConsolidado = (file: File, ambito: ConsolidadoS10Ambito) =>
    this.service.uploadConsolidadoS10(this.consolidadoDe!.id, file, ambito);

  /** Consolidado vigente de la salida abierta, para mostrarlo dentro del modal. */
  get consolidadoActual(): ConsolidadoS10Dto | null {
    const s = this.consolidadoDe;
    if (!s?.consolidadoS10Url) return null;
    return {
      id: 0,
      ambito: s.consolidadoS10Ambito ?? 'Rendicion',
      pdfUrl: s.consolidadoS10Url,
      pdfFilename: s.consolidadoS10Filename ?? 'Consolidado del S10',
      uploadedAt: '',
    };
  }

  /** Cierra el modal; si se subió algo recarga para reflejarlo en toda la planilla. */
  cerrarConsolidado(subido: ConsolidadoS10Dto | null): void {
    this.consolidadoDe = null;
    if (subido) this.recargar();
    else        this.cdr.detectChanges();
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /** Visible solo cuando la solicitud está Aprobada y aún no rendida. */
  puedeSubirCapturas(s: SolicitudSalidaListItemDto): boolean {
    return s.estadoAprobacion === 'Aprobado' && s.estadoRendicion !== 'Rendido';
  }

  abrirCapturas(s: SolicitudSalidaListItemDto, ev: Event): void {
    ev.stopPropagation(); // no abrir el modal de detalle
    this.capturasId = s.id;
  }

  /**
   * Cierra el modal de capturas. Si se subió al menos una captura (`recargar`), recarga el listado
   * para refrescar `puedeRendirse` — de lo contrario el botón "Rendir" seguiría deshabilitado con
   * datos viejos. No recarga si el usuario solo abrió y cerró sin subir nada.
   */
  cerrarCapturas(recargar: boolean): void {
    this.capturasId = null;
    if (recargar) this.recargar();
  }

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Cancelado': return { bg: '#E5E7EB', text: '#4B5563' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }

  // ── Reembolso ────────────────────────────────────────────────────────

  reembolsoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
      case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }

  /**
   * Avisa al jefe/revisor que el Consolidado del S10 ya está adjunto. Se puede repetir a
   * propósito (un correo se pierde, el jefe lo archiva sin leer): la fecha del último aviso queda
   * a la vista en el botón para que no se convierta en insistencia a ciegas.
   */
  async notificarRevisor(s: SolicitudSalidaListItemDto, ev: Event): Promise<void> {
    ev.stopPropagation(); // no abrir el detalle

    if (s.revisorNotificadoAt) {
      const result = await Swal.fire({
        icon: 'question',
        title: '¿Volver a avisar?',
        text: 'Ya le avisaste a tu revisor por esta salida. Se le enviará el correo otra vez.',
        showCancelButton: true,
        confirmButtonText: 'Sí, avisar de nuevo',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0F6E56',
      });
      if (!result.isConfirmed) return;
    }

    this.loaderService.show();
    this.service.notificarRevisor(s.id).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message, timer: 2000, showConfirmButton: false });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
