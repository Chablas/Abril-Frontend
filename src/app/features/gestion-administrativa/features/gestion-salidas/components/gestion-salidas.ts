import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { GestionSalidasService } from '../services/gestion-salidas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Roles } from '../../../../../core/constants/roles';
import { FormsModule } from '@angular/forms';
import {
  AreaNodeDto,
  EstadoReembolso,
  GestionSalidaDetalleDto,
  GestionSalidaListItemDto,
  MesRendicionDto,
  ResumenRendicionDto,
} from '../dtos/gestion-salida.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { TimePicker } from '../../../../../shared/components/time-picker/time-picker';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { GestionSalidaDetalleModal } from './gestion-salida-detalle-modal/gestion-salida-detalle-modal';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { FabButton } from '../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { ConsolidadoS10Modal } from '../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

import { FirmaRegistrarModal } from '../../../../../shared/components/firma-personal/registrar-modal/firma-registrar-modal';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';
/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

@Component({
  standalone: true,
  selector: 'app-gestion-salidas',
  imports: [CommonModule, FormsModule, StatusBadge, SearchSelect, TimePicker, Paginator, GestionSalidaDetalleModal, AbrilPageHeaderComponent, TitleCasePipe, FabButton, FilterTriggerButton, FilterModal, AbrilBulkActionDirective, ConsolidadoS10Modal, FirmaRegistrarModal],
  templateUrl: './gestion-salidas.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    /* Toggle "Hoy" del encabezado: misma forma y tamaño que el botón "Filtros" de al lado.
       Apagado se ve neutro como el resto de botones del header; encendido va relleno en teal
       para que se note sin leer que la tabla está acotada al día en curso. Se estila con clases
       (no con [style]) para no matar el :hover, que un estilo en línea siempre le gana. */
    .hoy-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border: 1px solid var(--color-abril-border);
      border-radius: 7px;
      background: #FFFFFF;
      color: var(--color-abril-body);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color .15s, border-color .15s, color .15s;
    }
    .hoy-toggle:hover { background: #F9FAFB; }
    .hoy-toggle--on {
      background: var(--color-abril-standard);
      border-color: var(--color-abril-standard);
      color: #FFFFFF;
    }
    .hoy-toggle--on:hover { background: var(--color-abril-standard-hover); }
    /* Foco visible por teclado (Tab), no al hacer clic — igual que app-filter-trigger. */
    .hoy-toggle:focus-visible {
      outline: 2px solid var(--color-abril-standard);
      outline-offset: 2px;
    }

    /* Chip del Consolidado del S10 dentro de la celda de Rendición. Va aquí y no en una
       columna propia porque el consolidado es parte de la rendición y la tabla ya trae 14/16
       columnas. Relleno = ya hay archivo adjunto; contorno = falta adjuntarlo. */
    .consolidado-chip {
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
      cursor: pointer;
      transition: background-color .15s ease, border-color .15s ease, color .15s ease;
    }
    .consolidado-chip:hover {
      border-color: var(--color-abril-standard);
      color: var(--color-abril-standard);
    }
    .consolidado-chip:focus-visible {
      outline: 2px solid var(--color-abril-standard);
      outline-offset: 2px;
    }
    .consolidado-chip--on {
      border-color: var(--color-abril-standard);
      background: var(--color-abril-standard-light);
      color: var(--color-abril-standard);
    }

    /* ── Tarjetas de resumen + barra "Mes a rendir" ─────────────────────────
       Las tarjetas cuentan el mismo conjunto que la tabla, así que se mueven con los filtros y
       con cada acción que cambia el estado. Se estilan acá y no en styles.css porque el trío es
       propio de las dos pantallas de salidas. */
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

    /* Barra del periodo de rendición: el desplegable, el estado de lo seleccionado y el botón
       que rinde. Va separada de la fila de acciones para que "rendir" no se confunda con
       aprobar/rechazar, que son de otro eje.

       Va en blanco (y no en el teal claro de la marca) porque el label flotante de
       app-search-select corta el borde con un fondo blanco fijo: sobre un fondo tintado se vería
       el recorte. El acento queda en el borde izquierdo. */
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
    /* Casilla "Seleccionar todas del mes": la selección deja de ser la de la página y pasa a ser
       la del periodo entero, que resuelve el servidor. */
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
export class GestionSalidas implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();
  salidas: GestionSalidaListItemDto[] = [];

  trabajadorOptions: any[] = [];
  lugarProyectoOptions: any[] = [];
  readonly estadoRendicionOptions = [
    { value: null,           label: 'Todas' },
    { value: 'No rendido',   label: 'No rendidas' },
    { value: 'Rendido',      label: 'Rendidas' },
  ];
  readonly estadoAprobacionOptions = [
    { value: null,        label: 'Todas' },
    { value: 'Pendiente', label: 'Pendientes' },
    { value: 'Aprobado',  label: 'Aprobadas' },
    { value: 'Rechazado', label: 'Rechazadas' },
    { value: 'Cancelado', label: 'Canceladas' },
  ];

  /**
   * Estados del reembolso para el desplegable. Un tesorero solo ve Firmadas y Pagadas: su bandeja
   * es esa y el backend la recorta igual, así que ofrecerle "Pendientes" sería un filtro que
   * siempre devuelve vacío.
   *
   * Es un campo y no un getter a propósito: `app-search-select` compara `[options]` por
   * referencia, y un getter devolvería un array nuevo en cada pasada de detección de cambios.
   * El rol no cambia dentro de la sesión, así que se calcula una vez en ngOnInit.
   */
  estadoReembolsoOptions: { value: string | null; label: string }[] = [];

  private readonly estadoReembolsoOptionsRevisor = [
    { value: null,        label: 'Todos' },
    { value: 'Pendiente', label: 'Por revisar' },
    { value: 'Aprobado',  label: 'Aprobados' },
    { value: 'Rechazado', label: 'Rechazados' },
    { value: 'Firmado',   label: 'Firmados' },
    { value: 'Pagado',    label: 'Pagados' },
  ];

  private readonly estadoReembolsoOptionsTesoreria = [
    { value: null,      label: 'Firmadas y pagadas' },
    { value: 'Firmado', label: 'Solo firmadas' },
    { value: 'Pagado',  label: 'Solo pagadas' },
  ];

  filters = {
    workerId:          null as number | null,
    lugarProyectoId:   null as number | null,
    estadoRendicion:   null as string | null,
    estadoAprobacion:  null as string | null,
    estadoReembolso:   null as string | null,
  };

  /**
   * Modo TESORERÍA: la pantalla es una bandeja de pagos — solo salidas firmadas y pagadas, sin las
   * acciones de aprobación/rendición (que no son suyas) y con "Marcar como pagadas" habilitado.
   *
   * Lo decide el BACKEND y llega en `filter-data`: son dos condiciones (el rol TESORERO y que el
   * puesto del trabajador sea de categoría Tesorero) y la segunda vive en la base. Mirando solo
   * `hasRole(TESORERO)` se le habría pintado la bandeja de tesorería a alguien con el rol pero sin
   * el puesto, con un botón de pagar que el backend rechaza.
   *
   * Arranca en false: hasta que responda `filter-data` la pantalla se comporta como la de siempre.
   */
  esTesorero = false;

  /** Modal para registrar la firma en el momento (se abre con el 409 de firmar). */
  firmaModalAbierto = false;

  /** Ids que se estaban firmando cuando saltó el modal de firma, para reintentar al guardarla. */
  private idsPendientesDeFirma: number[] = [];

  /**
   * Filtro "Hoy": acota la tabla a las salidas cuya fecha de salida es la de hoy (hora de Perú;
   * la resuelve el backend). Arranca ACTIVO porque al entrar lo que se necesita ver es el día en
   * curso; al apagarlo se ven todas las fechas. Vive junto al botón "Filtros" y no dentro del
   * modal, así que ni suma al badge de filtros activos ni lo toca "Limpiar filtros".
   */
  soloHoy = true;

  // ── Periodo de rendición ("Mes a rendir") ────────────────────────────
  /**
   * Meses ofrecidos por el desplegable, con su cantidad de aptas. Los arma el backend a partir de
   * lo que realmente hay pendiente en el alcance del usuario, más el mes anterior como piso.
   */
  mesesRendicion: MesRendicionDto[] = [];

  /** Opciones del `app-search-select` del periodo: la clave es "AAAA-MM". */
  mesOptions: { key: string | null; label: string }[] = [];

  /**
   * Periodo elegido ("AAAA-MM") o null = apagado. Arranca APAGADO a propósito: el filtro "Hoy"
   * ya viene encendido y dos filtros de fecha a la vez no dirían qué se está viendo.
   *
   * Al prenderlo la tabla muestra SOLO lo apto para rendir de ese mes; es excluyente con "Hoy" y
   * gana el último que se toca.
   */
  mesRendirKey: string | null = null;

  /**
   * "Seleccionar todas las del mes": la selección deja de ser la lista de ids de la página y pasa
   * a ser el periodo completo, que resuelve el servidor (por eso no se puede combinar con la
   * selección por fila — tocar cualquier casilla la apaga).
   */
  todoElMes = false;

  /**
   * Números de las tarjetas del encabezado. Los cuenta el backend sobre el MISMO conjunto que
   * alimenta la tabla (todas las páginas, no solo la visible), así que llegan con el listado y
   * cambian con cada filtro.
   */
  resumen: ResumenRendicionDto = { aptasParaRendir: 0, capturasIncompletas: 0, observadas: 0 };

  // ── Filtro de área en cascada (igual al de Visibilidad de Salidas) ──
  /** Niveles visibles del desplegable en cascada: [0] = raíces, [1] = hijos del nodo elegido, … */
  areaLevels: AreaCascadeNode[][] = [];
  /** Nodo elegido por nivel (undefined = "Todas" en ese nivel). */
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];

  // ── Paginación (server-side) ────────────────────────────────────────
  readonly pageSize = 10;
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  // ── Ordenamiento (server-side) ──────────────────────────────────────
  /**
   * Orden por defecto de la tabla: por fecha de salida, de la más futura a la más antigua.
   * El backend ya devuelve ese mismo orden cuando no se le manda columna, así que el estado
   * inicial de la cabecera refleja lo que realmente se está viendo.
   */
  private readonly defaultSortBy: string = 'fechaSalida';
  private readonly defaultSortDir: 'asc' | 'desc' = 'desc';

  sortBy: string | null = this.defaultSortBy;
  sortDir: 'asc' | 'desc' | null = this.defaultSortDir;

  /** IDs seleccionados para acción bulk. */
  selectedIds = new Set<number>();

  /** Detalle abierto en modal (null = modal cerrado). */
  detalle: GestionSalidaDetalleDto | null = null;

  /** Salida cuyo modal de Consolidado del S10 está abierto. null = cerrado. */
  consolidadoDe: GestionSalidaListItemDto | null = null;

  /** Modal de filtros (los combos viven ahí para no ocupar espacio fijo en la galería). */
  filtrosAbiertos = false;

  /** Cantidad de filtros con valor activo, para el badge del botón "Filtros". */
  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.workerId != null) n++;
    if (this.filters.lugarProyectoId != null) n++;
    if (this.filters.estadoAprobacion != null) n++;
    if (this.filters.estadoRendicion != null) n++;
    if (this.filters.estadoReembolso != null) n++;
    if (this.selectedAreaNodes.some((node) => node)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = {
      workerId: null,
      lugarProyectoId: null,
      estadoRendicion: null,
      estadoAprobacion: null,
      estadoReembolso: null,
    };
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.onSearch();
  }

  constructor(
    private service:       GestionSalidasService,
    private loaderService: LoaderService,
    private errorService:  ErrorService,
    private authService:   AuthService,
    private router:        Router,
    private route:         ActivatedRoute,
    private cdr:           ChangeDetectorRef,
  ) {}

  /** FAB "Solicitar salida": lleva a la pestaña de autoservicio con el formulario abierto. */
  irASolicitarSalida(): void {
    this.router.navigate(['/gestion-administrativa/solicitud-salidas'], { queryParams: { nuevo: '1' } });
  }

  /** True si el usuario logueado tiene rol "USUARIO DE RECEPCIÓN" — habilita la columna extra. */
  get esRecepcion(): boolean {
    return this.authService.hasRole(Roles.USUARIO_RECEPCION);
  }

  guardarHoraSalidaReal(s: GestionSalidaListItemDto, valor: string | null): void {
    this.guardarHoraReal(
      s, valor, s.horaSalidaReal,
      (id, hora) => this.service.setHoraSalidaReal(id, hora),
      (hora) => (s.horaSalidaReal = hora),
    );
  }

  guardarHoraRetornoReal(s: GestionSalidaListItemDto, valor: string | null): void {
    this.guardarHoraReal(
      s, valor, s.horaRetornoReal,
      (id, hora) => this.service.setHoraRetornoReal(id, hora),
      (hora) => (s.horaRetornoReal = hora),
    );
  }

  /**
   * Guarda (o limpia) una hora real. app-time-picker emite "HH:mm" o null al limpiar; el backend
   * acepta null para limpiar. Genérico para las columnas de salida y retorno (solo recepción).
   */
  private guardarHoraReal(
    s: GestionSalidaListItemDto,
    valor: string | null,
    actual: string | null,
    persistir: (id: number, hora: string | null) => Observable<{ message: string }>,
    aplicar: (hora: string | null) => void,
  ): void {
    const hora = valor && valor.trim() !== '' ? valor : null;
    if ((actual ?? '').substring(0, 5) === (hora ?? '')) return; // sin cambio

    this.loaderService.show();
    persistir(s.id, hora).subscribe({
      next: (res) => {
        aplicar(hora);
        this.loaderService.hide();
        Swal.fire({
          title: res.message,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Devuelve "HH:mm" listo para app-time-picker (el backend devuelve "HH:mm:ss"). */
  horaSalidaRealInput(s: GestionSalidaListItemDto): string {
    return s.horaSalidaReal ? s.horaSalidaReal.substring(0, 5) : '';
  }

  /** Devuelve "HH:mm" listo para app-time-picker (el backend devuelve "HH:mm:ss"). */
  horaRetornoRealInput(s: GestionSalidaListItemDto): string {
    return s.horaRetornoReal ? s.horaRetornoReal.substring(0, 5) : '';
  }

  /**
   * true si recepción registra la hora real de esta salida. No se registra en dos casos: los
   * motivos de hora estimada, y los motivos que no declaran horario (la salida no trae hora de
   * salida, ej. licencia sin goce de haber).
   */
  registraHoraReal(s: GestionSalidaListItemDto): boolean {
    return !s.esHoraEstimada && !!s.horaSalida;
  }

  /** Por qué esta salida no lleva hora real — va en el title del guion. */
  motivoHoraRealNoAplica(s: GestionSalidaListItemDto): string {
    return s.horaSalida
      ? 'Motivo con hora estimada: no se registra hora real'
      : 'El motivo de esta salida no declara horario';
  }

  ngOnInit(): void {
    this.estadoReembolsoOptions = this.estadoReembolsoOptionsRevisor;

    this.loadFilterData();
    this.load();

    // Los botones de los correos ("Revisar el reembolso") entran por acá: abren directo el detalle
    // de esa solicitud sin que el revisor tenga que buscarla en la tabla.
    const solicitudId = Number(this.route.snapshot.queryParamMap.get('solicitud'));
    if (solicitudId > 0) this.abrirDetallePorId(solicitudId);
  }

  /** Abre el modal de detalle de una solicitud por id (enlace directo desde un correo). */
  private abrirDetallePorId(id: number): void {
    this.loaderService.show();
    this.service.getDetalle(id).subscribe({
      next: (data) => {
        this.detalle = data;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        // El modo tesorería lo decide el backend (rol + categoría del puesto). Al entrar en él la
        // pantalla se recarga sin el filtro "Hoy": Tesorería paga contra fechas pasadas, así que
        // acotarla al día en curso le dejaría la bandeja vacía.
        if (data.esTesorero && !this.esTesorero) {
          this.esTesorero = true;
          this.estadoReembolsoOptions = this.estadoReembolsoOptionsTesoreria;
          this.soloHoy = false;
          this.load();
        }

        this.trabajadorOptions = [
          { workerId: null, nombreCompleto: 'Todos los trabajadores' },
          ...data.trabajadores,
        ];
        this.lugarProyectoOptions = [
          { gaLugarId: null, nombreDisplay: 'Todos los proyectos' },
          ...data.lugaresProyecto,
        ];
        this.buildAreaCascade(data.areaTree);
        this.aplicarPeriodos(data.mesesRendicion ?? []);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Periodo de rendición ("Mes a rendir") ───────────────────────────────

  /**
   * Guarda los meses que devolvió el backend. Si el periodo que estaba elegido ya no existe (se
   * rindió todo ese mes) se apaga solo: dejarlo puesto mostraría una tabla vacía sin decir por qué.
   */
  private aplicarPeriodos(meses: MesRendicionDto[]): void {
    this.mesesRendicion = meses;
    this.mesOptions = [
      { key: null, label: 'Sin filtrar por mes' },
      ...meses.map((m) => ({ key: this.mesKey(m.anio, m.mes), label: m.label })),
    ];

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

  private get rendicionAnio(): number | null { return this.mesSeleccionado?.anio ?? null; }
  private get rendicionMes(): number | null  { return this.mesSeleccionado?.mes  ?? null; }

  /**
   * Cambio del periodo. Apaga "Hoy" —los dos acotan la fecha y no pueden convivir— y descarta la
   * selección anterior, que era de otro conjunto de filas.
   */
  onMesRendirChange(key: string | null): void {
    this.mesRendirKey = key || null;
    this.todoElMes = false;
    if (this.mesRendirKey) this.soloHoy = false;
    this.onSearch();
  }

  // ── Filtro de área en cascada ────────────────────────────────────────────

  /** Arma el árbol a partir de la lista plana de nodos area_scope y deja listo el 1er nivel. */
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

  /** Al elegir un nodo: recorta los niveles inferiores y, si tiene hijos, agrega el siguiente desplegable. */
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

  /** area_scope_id del nodo seleccionado más profundo + todos sus descendientes (o null si "Todas"). */
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

  load(page: number = 1): void {
    this.loaderService.show();
    this.selectedIds.clear();
    this.lastClickedIndex = null;
    this.service.getAll(
      this.filters.workerId,
      this.filters.lugarProyectoId,
      this.filters.estadoRendicion,
      this.filters.estadoAprobacion,
      this.filters.estadoReembolso,
      page,
      this.sortBy,
      this.sortDir,
      this.currentAreaScopeIds(),
      this.soloHoy,
      this.rendicionAnio,
      this.rendicionMes,
    ).subscribe({
      next: (res) => {
        this.salidas      = res.data;
        this.currentPage  = res.page;
        this.totalPages   = res.totalPages;
        this.totalRecords = res.totalRecords;
        // Las tarjetas se cuentan sobre todo el conjunto filtrado (no sobre esta página): llegan
        // con el listado, así que un cambio de filtro las mueve sin una petición extra.
        this.resumen      = res.resumen;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Cualquier cambio de filtro vuelve a la primera página y suelta la selección del mes. */
  onSearch(): void {
    this.todoElMes = false;
    this.load(1);
  }

  /**
   * Recarga la tabla (con sus tarjetas) y el desplegable de mes. Se usa después de cada acción que
   * mueve el estado (aprobar, rendir, decidir un reembolso): el desplegable sale de `filter-data`,
   * así que sin esto seguiría ofreciendo periodos con el conteo de antes de la acción.
   */
  private recargar(): void {
    this.load(this.currentPage);
    this.loadFilterData();
  }

  /**
   * Alterna el filtro "Hoy" y recarga la tabla desde la primera página. Al prenderlo apaga el
   * periodo de rendición: los dos acotan la fecha, así que gana el último que se toca.
   */
  toggleSoloHoy(): void {
    this.soloHoy = !this.soloHoy;
    if (this.soloHoy && this.mesRendirKey) {
      this.mesRendirKey = null;
      this.todoElMes = false;
    }
    this.onSearch();
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  // ── Ordenamiento de columnas (server-side) ──────────────────────────
  /**
   * Cicla el orden de una columna: ascendente → descendente → vuelve al orden por defecto
   * (fecha de salida, de la más futura a la más antigua). La propia columna de fecha solo
   * alterna desc ⇄ asc, porque "volver al defecto" ya es su estado descendente.
   * El orden se aplica en el servidor sobre todos los registros (no solo la página visible).
   */
  toggleSort(column: string): void {
    if (this.sortBy !== column) {
      this.sortBy = column;
      this.sortDir = 'asc';
    } else if (this.sortDir === 'asc') {
      this.sortDir = 'desc';
    } else if (column === this.defaultSortBy) {
      this.sortDir = 'asc';
    } else {
      this.sortBy = this.defaultSortBy;
      this.sortDir = this.defaultSortDir;
    }
    this.load(1);
  }

  /** Dirección de orden activa para una columna (o null si no está ordenada por ella). */
  sortDirOf(column: string): 'asc' | 'desc' | null {
    return this.sortBy === column ? this.sortDir : null;
  }

  exportarExcel(): void {
    this.loaderService.show();
    this.service.downloadExcel(
      this.filters.workerId,
      this.filters.lugarProyectoId,
      this.filters.estadoRendicion,
      this.filters.estadoAprobacion,
      this.filters.estadoReembolso,
      this.currentAreaScopeIds(),
      this.soloHoy,
    ).subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'Gestion_Salidas.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Acciones bulk: aprobar / rechazar ────────────────────────────────
  /** Aprueba en bloque las solicitudes seleccionadas que estén en estado Pendiente. */
  async aprobarBulk(): Promise<void> {
    if (!this.puedeAprobarSeleccion) return;
    const items = this.selectedPendientes;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${items.length} solicitud(es)?`,
      text: 'Se aprobarán todas las solicitudes pendientes seleccionadas.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    forkJoin(items.map((s) => this.service.aprobar(s.id))).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: `${items.length} solicitud(es) aprobada(s)`, icon: 'success', timer: 1500, showConfirmButton: false });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Rechaza en bloque las solicitudes seleccionadas que sean rechazables: pendientes, o aprobadas
   * que aún no fueron rendidas. Nunca las propias (salvo Gerente) ni las ya rendidas.
   */
  async rechazarBulk(): Promise<void> {
    if (!this.puedeRechazarSeleccion) return;
    const items = this.selectedRechazables;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: `¿Rechazar ${items.length} solicitud(es)?`,
      text: 'Se rechazarán las solicitudes seleccionadas que estén pendientes o aprobadas aún no rendidas.',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    forkJoin(items.map((s) => this.service.rechazar(s.id))).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: `${items.length} solicitud(es) rechazada(s)`, icon: 'success', timer: 1500, showConfirmButton: false });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Selección de filas (estilo Outlook: click + shift+click rango) ────

  /** Índice de la última fila clickeada (ancla para la selección por rango con Shift). */
  private lastClickedIndex: number | null = null;

  /**
   * Solo se rinde lo apto: aprobada, no rendida, con TODOS los trayectos cubiertos y con un motivo
   * marcado como reembolsable en Configuración → Motivos. Lo resuelve el backend en `aptaParaRendir`
   * para que la pantalla, el desplegable de mes y las tarjetas no puedan discrepar.
   */
  esSeleccionable(s: GestionSalidaListItemDto): boolean {
    return s.aptaParaRendir;
  }

  /**
   * Click sobre una fila de la tabla. Con Shift presionado selecciona el registro
   * (o el rango, como en la casilla) en vez de abrir el detalle.
   */
  onRowClick(event: MouseEvent, index: number): void {
    if (event.shiftKey) {
      // Evita que Shift+clic resalte texto de la fila.
      if (typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
      this.onSelectClick(event, index);
      return;
    }
    this.abrirDetalle(this.salidas[index]);
  }

  /**
   * Maneja el click sobre la casilla de selección de una fila.
   * Con Shift presionado selecciona todo el rango entre la última fila clickeada
   * y la actual (como en Outlook); sin Shift alterna solo esa fila.
   */
  onSelectClick(event: MouseEvent, index: number): void {
    event.stopPropagation();

    // Volver a elegir fila por fila cancela "todas las del mes": son dos formas distintas de
    // seleccionar y mantener las dos a la vez haría que el conteo mienta.
    this.todoElMes = false;

    const clickeada = this.salidas[index];

    // Una planilla de rendición es de UN SOLO MES. Si la fila es de otro mes que el que ya está
    // seleccionado, la selección arranca de cero con esta fila en vez de bloquear el clic: así el
    // usuario cambia de periodo sin tener que ir a deseleccionar lo anterior.
    if (this.mesDeSeleccion && this.mesDeFecha(clickeada.fechaSalida) !== this.mesDeSeleccion) {
      this.selectedIds.clear();
      this.selectedIds.add(clickeada.id);
      this.lastClickedIndex = index;
      return;
    }

    if (event.shiftKey && this.lastClickedIndex !== null) {
      const [desde, hasta] = [this.lastClickedIndex, index].sort((a, b) => a - b);
      const mesAncla = this.mesDeFecha(this.salidas[this.lastClickedIndex].fechaSalida);
      for (let k = desde; k <= hasta; k++) {
        // El rango se recorta al mes del ancla: un Shift+clic que cruza meses no puede colar
        // filas de otro periodo en la selección.
        if (this.mesDeFecha(this.salidas[k].fechaSalida) === mesAncla) this.selectedIds.add(this.salidas[k].id);
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
    const primera = this.salidas.find((s) => this.selectedIds.has(s.id));
    return primera ? this.mesDeFecha(primera.fechaSalida) : null;
  }

  /**
   * "Todo seleccionado" se mide contra el mes de la selección, no contra la página entera: una
   * página puede mezclar meses y una planilla es de uno solo, así que marcar la casilla de la
   * cabecera nunca puede dejar la tabla en un estado que el backend vaya a rechazar.
   */
  get allSelected(): boolean {
    if (this.todoElMes) return this.salidas.length > 0;
    const mes = this.mesDeSeleccion;
    if (!mes) return false;
    return this.filasDelMes(mes).every((s) => this.selectedIds.has(s.id));
  }

  private filasDelMes(mes: string): GestionSalidaListItemDto[] {
    return this.salidas.filter((s) => this.mesDeFecha(s.fechaSalida) === mes);
  }

  /**
   * Si la fila entra en la selección actual. Con "todas del mes" marcado entran todas las que la
   * tabla está mostrando (el filtro ya dejó solo lo apto de ese periodo), aunque sus ids no estén
   * en `selectedIds` — esa selección la resuelve el servidor.
   */
  filaSeleccionada(s: GestionSalidaListItemDto): boolean {
    return this.todoElMes || this.selectedIds.has(s.id);
  }

  /**
   * Casilla de la cabecera: selecciona (o suelta) las filas de la PÁGINA actual que sean del mes
   * ya seleccionado; sin selección previa toma el mes de la primera fila. Con el filtro de mes
   * puesto la página es de un solo periodo y esto equivale a "seleccionar todo".
   */
  toggleSelectAll(): void {
    this.todoElMes = false;
    if (this.allSelected) {
      this.selectedIds.clear();
      this.lastClickedIndex = null;
      return;
    }

    const mes = this.mesDeSeleccion
      ?? (this.salidas.length ? this.mesDeFecha(this.salidas[0].fechaSalida) : null);
    if (!mes) return;

    this.selectedIds = new Set(this.filasDelMes(mes).map((s) => s.id));
    this.lastClickedIndex = null;
  }

  /**
   * "Seleccionar todas las del mes": pasa de la selección por ids (limitada a la página) a una
   * selección por periodo que ejecuta el servidor. Solo tiene sentido con un mes elegido, porque
   * ahí la tabla ya muestra únicamente lo apto para rendir.
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
    return this.todoElMes ? this.totalRecords : this.selectedIds.size;
  }

  /** Cuántos de los seleccionados se van a rendir realmente. */
  get rendiblesCount(): number {
    return this.todoElMes ? this.totalRecords : this.selectedRendibles.length;
  }

  /**
   * Texto del indicador de selección de la barra de rendición. Nombra el periodo cuando la
   * selección viene de filas sueltas: como una planilla es de un solo mes, saber cuál está en
   * juego es parte de lo que el usuario tiene que ver antes de rendir.
   */
  get seleccionResumen(): string {
    if (this.todoElMes) {
      const mes = this.mesSeleccionado?.label ?? 'el mes';
      return `Seleccionadas todas las de ${mes}: ${this.totalRecords}`;
    }
    if (this.selectedIds.size === 0) return 'Sin solicitudes seleccionadas';

    const n = this.selectedIds.size;
    const listas = this.selectedRendibles.length;
    const periodo = this.mesRendirKey ? '' : ` de ${this.etiquetaDeMes(this.mesDeSeleccion)}`;
    const base = `${n} seleccionada${n === 1 ? '' : 's'}${periodo}`;
    return listas === n ? base : `${base} · ${listas} lista${listas === 1 ? '' : 's'} para rendir`;
  }

  /** "AAAA-MM" → "Agosto 2026". Cae al propio código si el mes no está en el catálogo. */
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

  // ── Subconjuntos válidos de la selección por acción ──────────────────
  get selectedSalidas(): GestionSalidaListItemDto[] {
    return this.salidas.filter((s) => this.selectedIds.has(s.id));
  }

  /** Seleccionadas en estado Pendiente (objetivo de Aprobar). Solo lo pendiente se aprueba. */
  get selectedPendientes(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter((s) => s.estadoAprobacion === 'Pendiente');
  }

  /**
   * True si una salida puede rechazarse: está Pendiente, o ya fue Aprobada pero AÚN NO se rindió.
   * El revisor puede revertir una aprobación mientras no exista la rendición; una vez rendida
   * (Rendido) la aprobación queda firme. El backend re-valida esta misma regla.
   */
  private esRechazable(s: GestionSalidaListItemDto): boolean {
    return s.estadoAprobacion === 'Pendiente'
      || (s.estadoAprobacion === 'Aprobado' && s.estadoRendicion === 'No rendido');
  }

  /** Seleccionadas candidatas a rechazo (pendientes o aprobadas aún no rendidas). */
  get selectedRechazables(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter((s) => this.esRechazable(s));
  }

  /**
   * True si alguna candidata (a aprobar o rechazar) es propia y no decidible. Nadie decide lo suyo
   * (salvo Gerente), y si se mezcla una propia con otras se bloquea toda la acción — hay que
   * deseleccionar la propia primero. El backend lo determina por fila (`puedeDecidir`) y lo re-valida.
   */
  get aprobacionIncluyePropia(): boolean {
    return this.selectedPendientes.some((s) => !s.puedeDecidir);
  }

  get rechazoIncluyePropia(): boolean {
    return this.selectedRechazables.some((s) => !s.puedeDecidir);
  }

  /** True si se puede aprobar la selección: hay pendientes y NINGUNA es propia. */
  get puedeAprobarSeleccion(): boolean {
    return this.selectedPendientes.length > 0 && !this.aprobacionIncluyePropia;
  }

  /** True si se puede rechazar la selección: hay rechazables y NINGUNA es propia. */
  get puedeRechazarSeleccion(): boolean {
    return this.selectedRechazables.length > 0 && !this.rechazoIncluyePropia;
  }

  /** Seleccionadas que pueden rendirse (aplican a Marcar como rendidas). */
  get selectedRendibles(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter((s) => this.esSeleccionable(s));
  }

  /**
   * Seleccionadas que el usuario puede cancelar: solo las SUYAS (esPropia) y en estado Pendiente.
   * Nunca se cancelan solicitudes de otros trabajadores.
   */
  get selectedCancelables(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter((s) => s.esPropia && s.estadoAprobacion === 'Pendiente');
  }

  /** Cancela en bloque las solicitudes propias y pendientes de la selección. */
  async cancelarBulk(): Promise<void> {
    const items = this.selectedCancelables;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: items.length === 1 ? '¿Cancelar esta solicitud?' : `¿Cancelar ${items.length} solicitud(es)?`,
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

  // ── Rendición ────────────────────────────────────────────────────────

  /**
   * Rinde lo seleccionado. Hay dos caminos según cómo se hizo la selección, y por eso es un solo
   * botón y no dos: por ids cuando se eligieron filas (la página es el límite de lo que el cliente
   * conoce) y por periodo cuando está marcado "todas las del mes", donde el conjunto lo resuelve
   * el servidor y puede pasar de la página visible.
   */
  async marcarRendidasBulk(): Promise<void> {
    if (this.todoElMes) return this.rendirTodoElMes();

    const ids = this.selectedRendibles.map((s) => s.id);
    if (ids.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Marcar ${ids.length} solicitud(es) como rendidas?`,
      text: 'Esto indica que ya fueron rendidas en el sistema S10.',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como rendidas',
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
   * True cuando hay algún filtro de alcance activo (trabajador, proyecto o área). La rendición del
   * mes completo respeta esos filtros, así que la barra lo dice antes de que el usuario confirme.
   */
  get rendicionFiltrada(): boolean {
    return this.filters.workerId != null
        || this.filters.lugarProyectoId != null
        || this.currentAreaScopeIds() != null;
  }

  /**
   * Rinde TODAS las salidas aptas del periodo elegido dentro del alcance del usuario, respetando
   * los filtros de trabajador/área/proyecto. El servidor decide qué entra (aprobadas, no rendidas,
   * con sus trayectos cubiertos y con motivo reembolsable) e ignora el resto.
   */
  private async rendirTodoElMes(): Promise<void> {
    const mes = this.mesSeleccionado;
    if (!mes) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Rendir las salidas de ${mes.label}?`,
      text: this.rendicionFiltrada
        ? 'Se rinde solo lo que dejan ver los filtros activos, y solo lo que está apto para rendir.'
        : 'Entran todas las salidas del mes que estén aptas para rendir.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rendir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0086A5',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.rendirMes(
      this.filters.workerId,
      this.filters.lugarProyectoId,
      this.currentAreaScopeIds(),
      mes.anio,
      mes.mes,
    ).subscribe({
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
      title: `${count} solicitud(es) marcada(s) como rendida(s)`,
      text: 'Se descargó la planilla de gasto por movilidad.',
      icon: 'success',
    });
    this.recargar();
  }

  // ── Consolidado del S10 (solo salidas rendidas) ──────────────────────

  /** El consolidado solo aplica cuando la salida ya fue rendida. */
  puedeAdjuntarConsolidado(s: GestionSalidaListItemDto): boolean {
    return s.estadoRendicion === 'Rendido';
  }

  abrirConsolidado(s: GestionSalidaListItemDto, ev: Event): void {
    ev.stopPropagation(); // no abrir el modal de detalle
    this.consolidadoDe = s;
  }

  /** Función de subida que consume el modal compartido (ya sabe a qué endpoint pegarle). */
  readonly subirConsolidado = (file: File) =>
    this.service.uploadConsolidadoS10(this.consolidadoDe!.id, file);

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
    // Soporta filename="..." y filename*=UTF-8''...
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ── Modal de detalle ────────────────────────────────────────────────

  abrirDetalle(s: GestionSalidaListItemDto): void {
    this.loaderService.show();
    this.service.getDetalle(s.id).subscribe({
      next: (data) => {
        this.detalle = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  // ── Colores de badges ────────────────────────────────────────────────

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Cancelado': return { bg: '#E5E7EB', text: '#4B5563' };
      default:          return { bg: '#FEF9C3', text: '#92400E' };
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }

  // ── Reembolso ────────────────────────────────────────────────────────

  reembolsoColors(estado: EstadoReembolso): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
      case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }

  /**
   * Seleccionadas cuyo reembolso se puede decidir: ya rendidas, con el Consolidado del S10 adjunto
   * y sin decidir (o rechazadas, que se pueden reconsiderar). Nunca las propias, misma regla que
   * la aprobación de la salida.
   */
  get selectedReembolsoRevisables(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter(
      (s) =>
        s.reembolsoRevisable &&
        (s.estadoReembolso === 'Pendiente' || s.estadoReembolso === 'Rechazado'),
    );
  }

  /** True si alguna candidata a decidir el reembolso es propia (y el usuario no es Gerente). */
  get reembolsoIncluyePropia(): boolean {
    return this.selectedReembolsoRevisables.some((s) => !s.puedeDecidir);
  }

  get puedeDecidirReembolso(): boolean {
    return this.selectedReembolsoRevisables.length > 0 && !this.reembolsoIncluyePropia;
  }

  /** Seleccionadas listas para firmar: el reembolso ya está aprobado. */
  get selectedFirmables(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter((s) => s.estadoReembolso === 'Aprobado');
  }

  /** Seleccionadas que Tesorería puede marcar como pagadas: las ya firmadas. */
  get selectedPagables(): GestionSalidaListItemDto[] {
    return this.selectedSalidas.filter((s) => s.estadoReembolso === 'Firmado');
  }

  async aprobarReembolsoBulk(): Promise<void> {
    const items = this.selectedReembolsoRevisables;
    if (items.length === 0 || this.reembolsoIncluyePropia) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${items.length} reembolso(s)?`,
      text: 'Se le avisará por correo a cada trabajador.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.aprobarReembolso(items.map((s) => s.id)).subscribe({
      next: (res) => this.trasAccionReembolso(res.message),
      error: (err: HttpErrorResponse) => this.errorReembolso(err),
    });
  }

  async rechazarReembolsoBulk(): Promise<void> {
    const items = this.selectedReembolsoRevisables;
    if (items.length === 0 || this.reembolsoIncluyePropia) return;

    // La observación es el correo: es lo único que el trabajador va a leer para saber qué corregir,
    // así que se pide acá y el backend la exige también.
    const result = await Swal.fire({
      icon: 'warning',
      title: `¿Rechazar ${items.length} reembolso(s)?`,
      input: 'textarea',
      inputLabel: 'Observación',
      inputPlaceholder: 'Qué tiene que corregir el trabajador…',
      inputAttributes: { 'aria-label': 'Observación del rechazo', maxlength: '1000' },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
      inputValidator: (valor) =>
        valor && valor.trim().length > 0 ? null : 'Escribe la observación del rechazo.',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.rechazarReembolso(items.map((s) => s.id), (result.value as string).trim()).subscribe({
      next: (res) => this.trasAccionReembolso(res.message),
      error: (err: HttpErrorResponse) => this.errorReembolso(err),
    });
  }

  async firmarBulk(): Promise<void> {
    const items = this.selectedFirmables;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Firmar ${items.length} salida(s)?`,
      text: 'Se estampará tu firma en la planilla de rendición. El PDF original se conserva.',
      showCancelButton: true,
      confirmButtonText: 'Sí, firmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    });
    if (!result.isConfirmed) return;

    this.firmar(items.map((s) => s.id));
  }

  /**
   * Firma las planillas. El 409 significa "todavía no registraste tu firma": en vez de mandar al
   * usuario a Configuración se abre el modal para que la dibuje ahí mismo, y al guardarla se
   * reintenta sola la firma que quedó pendiente.
   */
  private firmar(ids: number[]): void {
    this.loaderService.show();
    this.service.firmarPlanillas(ids).subscribe({
      next: (res) => {
        this.idsPendientesDeFirma = [];
        this.trasAccionReembolso(res.message);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        if (err.status === 409 && !this.firmaModalAbierto) {
          this.idsPendientesDeFirma = ids;
          this.firmaModalAbierto = true;
          this.cdr.detectChanges();
          return;
        }
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** El usuario acaba de registrar su firma en el modal: se reintenta lo que estaba firmando. */
  onFirmaRegistrada(): void {
    this.firmaModalAbierto = false;
    const ids = this.idsPendientesDeFirma;
    this.idsPendientesDeFirma = [];
    if (ids.length > 0) this.firmar(ids);
    else this.cdr.detectChanges();
  }

  cerrarFirmaModal(): void {
    this.firmaModalAbierto = false;
    this.idsPendientesDeFirma = [];
    this.cdr.detectChanges();
  }

  async marcarPagadasBulk(): Promise<void> {
    const items = this.selectedPagables;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Marcar ${items.length} reembolso(s) como pagado(s)?`,
      text: 'Es el último paso del ciclo: después no se revierte desde la pantalla.',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como pagadas',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#15803D',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.marcarPagadas(items.map((s) => s.id)).subscribe({
      next: (res) => this.trasAccionReembolso(res.message),
      error: (err: HttpErrorResponse) => this.errorReembolso(err),
    });
  }

  private trasAccionReembolso(message: string): void {
    this.loaderService.hide();
    Swal.fire({ title: message, icon: 'success', timer: 1800, showConfirmButton: false });
    this.recargar();
  }

  private errorReembolso(err: HttpErrorResponse): void {
    this.loaderService.hide();
    this.errorService.handleError(err);
    this.cdr.detectChanges();
  }

  /** Abre la planilla firmada de una salida en otra pestaña. */
  abrirPlanillaFirmada(s: GestionSalidaListItemDto, ev: Event): void {
    ev.stopPropagation();
    if (s.planillaFirmadaUrl && typeof window !== 'undefined') {
      window.open(s.planillaFirmadaUrl, '_blank', 'noopener');
    }
  }
}
