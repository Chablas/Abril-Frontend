import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { ClientPager } from '../../../shared/utils/client-pager';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReclutamientoService } from './services/reclutamiento.service';
import {
  Opcion,
  PipelineEtapa,
  RequerimientoGthListItem,
  ResumenReclutamiento,
} from './dtos/reclutamiento.dto';
import { GthDetalleRequerimiento } from './components/detalle/detalle';
import { GthConfiguracionCorreos } from '../shared/configuracion-correos/configuracion-correos';
import { estadoColors } from './estado-colors';

/**
 * Vista de GTH del módulo Reclutamiento: bandeja con las tarjetas de resumen, el aviso de
 * solicitudes nuevas, el embudo "Pipeline de reclutamiento" y la tabla de "Solicitudes de
 * contratación" de toda la organización. Es la contraparte de la vista del solicitante
 * (Solicitud de Personal); aquí GTH ve y gestiona lo que piden las jefaturas.
 */
@Component({
  standalone: true,
  selector: 'app-gth-reclutamiento',
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
    GthDetalleRequerimiento,
    GthConfiguracionCorreos,
  ],
  templateUrl: './reclutamiento.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    /* El desplegable de Prioridad (position:absolute, z-50) debe sobreponerse en vez
       de quedar recortado por el overflow del wrap: al no recortar, no aparece scroll
       ni se empuja el contenido. Scoped a este componente (no afecta otras tablas).

       flex:0 0 auto es obligatorio junto con overflow:visible. El global
       (.abril-table-wrap en styles.css) trae flex:0 1 auto + min-height:0, que permite
       que el flex encoja la caja del wrap por debajo del alto real de la tabla cuando
       el contenido de arriba (tarjetas + aviso + pipeline) deja poco espacio. Con el
       overflow:auto global eso solo genera scroll interno, pero acá — al no recortar —
       la tabla se seguía pintando fuera de su caja y tapaba el paginador, que queda
       anclado al borde inferior del wrap encogido (bug visual real: se comía filas).
       Sin encogimiento el wrap abraza su contenido, el paginador cae justo debajo de
       la última fila y el scroll lo hace .page-container, que ya es overflow-auto. */
    .abril-table-wrap { overflow: visible; flex: 0 0 auto; }
  `],
})
export class GthReclutamiento implements OnInit {
  anioActual = new Date().getFullYear();

  /** Contadores de las tarjetas de resumen (los calcula el backend junto con la bandeja). */
  resumen: ResumenReclutamiento = {
    enProceso: 0,
    vacantesAbiertas: 0,
    evaluacionesProgramadas: 0,
    procesosCerrados: 0,
    solicitudesNuevas: 0,
  };

  /** Etapas del embudo "Pipeline de reclutamiento", en orden (vienen del backend). */
  pipeline: PipelineEtapa[] = [];

  solicitudes: RequerimientoGthListItem[] = [];
  /** Catálogo de prioridades (Alta/Media/Baja) para el desplegable de la columna. */
  prioridades: Opcion[] = [];

  // ── Filtros ───────────────────────────────────────────────────────────
  searchText = '';
  filtrosAbiertos = false;

  /**
   * Filtro del aviso "N solicitudes de vacante nuevas de jefatura": al hacer clic, la tabla queda
   * acotada a las que GTH todavía no ha tomado. Cuenta como filtro activo y se limpia con
   * "Limpiar filtros" como cualquier otro.
   */
  soloNuevas = false;

  /** Requerimiento abierto en el modal de detalle (null = modal cerrado). */
  detalleId: number | null = null;

  /** Modal de configuración del correo de long list (solo con la feature). */
  showConfig = false;

  private readonly pager = new ClientPager<RequerimientoGthListItem>();

  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
  ) {}

  /** feature_key que habilita la configuración (dinámico vía role_feature en BD). */
  private static readonly FEATURE_CONFIG = 'gestion-gth.reclutamiento.configuracion';

  /** ¿El usuario puede configurar el correo? (según los roles asignados a la feature). */
  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(GthReclutamiento.FEATURE_CONFIG);
  }

  /** Botón "Configuración" del header: solo si el rol del usuario tiene la feature. */
  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getBandeja().subscribe({
      next: (data) => {
        this.resumen = data.resumen;
        this.pipeline = data.pipeline;
        this.solicitudes = data.solicitudes;
        this.prioridades = data.prioridades;
        this.pager.reset();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Cambia la prioridad de un requerimiento desde el desplegable de la tabla. Actualiza de forma
   * optimista y revierte si el guardado falla. (allowClear está desactivado, así que el valor
   * nunca llega null desde el combo, pero se protege igual.)
   */
  onPrioridadChange(s: RequerimientoGthListItem, prioridadId: number | null): void {
    if (prioridadId == null || prioridadId === s.prioridadId) return;

    const prevId = s.prioridadId;
    const prevNombre = s.prioridadNombre;
    s.prioridadId = prioridadId;
    s.prioridadNombre = this.prioridades.find((p) => p.id === prioridadId)?.nombre ?? s.prioridadNombre;

    this.service.updatePrioridad(s.requerimientoId, prioridadId).subscribe({
      error: (err: HttpErrorResponse) => {
        s.prioridadId = prevId;
        s.prioridadNombre = prevNombre;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Aviso de solicitudes nuevas ────────────────────────────────────────
  /** Alterna el filtro del aviso: deja la tabla solo con las solicitudes nuevas (o la restaura). */
  toggleSoloNuevas(): void {
    this.soloNuevas = !this.soloNuevas;
    this.onFilterChange();
  }

  // ── Filtros ────────────────────────────────────────────────────────────
  get filtrosActivos(): number {
    return (this.searchText.trim() ? 1 : 0) + (this.soloNuevas ? 1 : 0);
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.soloNuevas = false;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredSolicitudes(): RequerimientoGthListItem[] {
    const q = this.searchText.trim();
    let filtradas = this.solicitudes;

    if (this.soloNuevas) filtradas = filtradas.filter((s) => s.estadoCodigo === 'NUEVO');

    if (!q) return filtradas;
    return filtradas.filter((s) =>
      SearchInput.matches(
        [s.codigo, s.puesto, s.area, s.proyectoObra, s.estadoNombre].filter(Boolean).join(' '),
        q,
      ),
    );
  }

  // ── Paginación (cliente) ───────────────────────────────────────────────
  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredSolicitudes);
  }

  get pagedSolicitudes(): RequerimientoGthListItem[] {
    return this.pager.page(this.filteredSolicitudes);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Modal de detalle (ojo de la tabla) ─────────────────────────────────
  abrirDetalle(s: RequerimientoGthListItem): void {
    this.detalleId = s.requerimientoId;
  }

  /** Cierra el modal de detalle; si hubo cambios guardados, refresca la bandeja. */
  onDetalleCerrado(huboCambios: boolean): void {
    this.detalleId = null;
    if (huboCambios) this.load();
  }

  // ── Colores del badge de estado (compartidos con el modal de detalle) ───
  estadoColors = estadoColors;
}
