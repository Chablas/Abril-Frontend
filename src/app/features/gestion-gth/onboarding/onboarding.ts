import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { ClientPager } from '../../../shared/utils/client-pager';
import { DEFAULT_PAGE_SIZE } from '../../../shared/constants/pagination';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from './services/onboarding.service';
import { FaseOnboarding, OnboardingListItem, ResumenOnboarding } from './dtos/onboarding.dto';
import { GthOnboardingDetalleModal } from './components/detalle/onboarding-detalle-modal';
import { avanceColor, estadoOnboardingColors } from './onboarding-estado-colors';

/**
 * Onboarding (Gestión GTH): la fase que sigue a Reclutamiento. Muestra las tarjetas de resumen, el
 * embudo «Fases del onboarding» y la tabla de colaboradores ingresados.
 *
 * Un colaborador aparece acá en cuanto su proceso de reclutamiento termina: firmó su carta oferta y
 * GTH se la aprobó, que es lo que cierra el requerimiento. No hay alta manual — el backend le abre
 * el onboarding sobre el file digital que esa carta ya creó, así que la lista es el resultado del
 * proceso anterior y no una bandeja de pendientes por dar de alta.
 */
@Component({
  standalone: true,
  selector: 'app-gth-onboarding',
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
    GthOnboardingDetalleModal,
  ],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GthOnboarding implements OnInit {
  anioActual = new Date().getFullYear();

  resumen: ResumenOnboarding = {
    ingresosDelMes: 0,
    enProceso: 0,
    completos: 0,
    colaboradoresNuevos: 0,
  };

  /** Fases del embudo, en orden (vienen del catálogo del backend). */
  fases: FaseOnboarding[] = [];

  colaboradores: OnboardingListItem[] = [];

  // ── Filtros ─────────────────────────────────────────────────────────────
  searchText = '';
  filtrosAbiertos = false;
  /** Filtro por fase: se activa también con los círculos del embudo. */
  faseCodigo: string | null = null;

  /** Colaborador cuyo detalle está abierto (se abre al hacer clic en su fila). */
  detalle: OnboardingListItem | null = null;

  /** La misma feature que gobierna las otras tres configuraciones de correos del módulo. */
  private static readonly FEATURE_CONFIG = 'gestion-gth.reclutamiento.configuracion';

  private readonly pager = new ClientPager<OnboardingListItem>(DEFAULT_PAGE_SIZE);

  constructor(
    private service: OnboardingService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Botón «Configuración» del header: solo si el rol del usuario tiene la feature. */
  get botonConfiguracion() {
    return this.authService.hasFeature(GthOnboarding.FEATURE_CONFIG)
      ? { label: 'Configuración', icono: 'ti-settings' }
      : undefined;
  }

  /** Lleva a la configuración de correos del onboarding. */
  abrirConfiguracion(): void {
    if (!this.botonConfiguracion) return;
    this.router.navigate(['/gestion-gth/onboarding/configuracion']);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getBandeja().subscribe({
      next: (data) => {
        this.resumen = data.resumen;
        this.fases = data.fases;
        this.colaboradores = data.colaboradores;
        this.pager.reset();
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

  // ── Modal de detalle ────────────────────────────────────────────────────
  abrirDetalle(colaborador: OnboardingListItem): void {
    this.detalle = colaborador;
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  /**
   * El detalle devuelve la fila ya actualizada (avanzó de fase). Se reemplaza en la lista en vez de
   * recargar la bandeja; el embudo y las tarjetas se recalculan porque dependen del conjunto entero.
   */
  onDetalleActualizado(colaborador: OnboardingListItem): void {
    this.colaboradores = this.colaboradores.map((c) =>
      c.onboardingId === colaborador.onboardingId ? colaborador : c,
    );
    this.detalle = colaborador;
    this.recalcularContadores();
    this.cdr.detectChanges();
  }

  /** Recalcula el embudo y las tarjetas sobre la lista que ya está en memoria. */
  private recalcularContadores(): void {
    const hoy = new Date();
    this.fases = this.fases.map((f) => ({
      ...f,
      total: this.colaboradores.filter((c) => c.faseCodigo === f.codigo).length,
    }));
    this.resumen = {
      ...this.resumen,
      ingresosDelMes: this.colaboradores.filter((c) => {
        if (!c.fechaIngreso) return false;
        const d = new Date(c.fechaIngreso);
        return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
      }).length,
      enProceso: this.colaboradores.filter((c) => c.estadoCodigo !== 'COMPLETO').length,
      completos: this.colaboradores.filter((c) => c.estadoCodigo === 'COMPLETO').length,
    };
  }

  // ── Embudo de fases ─────────────────────────────────────────────────────
  /** Un clic en el círculo de una fase acota la tabla a esa fase (y otro la restaura). */
  toggleFase(codigo: string): void {
    this.faseCodigo = this.faseCodigo === codigo ? null : codigo;
    this.onFilterChange();
  }

  // ── Filtros ─────────────────────────────────────────────────────────────
  get filtrosActivos(): number {
    return (this.searchText.trim() ? 1 : 0) + (this.faseCodigo ? 1 : 0);
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.faseCodigo = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredColaboradores(): OnboardingListItem[] {
    let lista = this.colaboradores;

    if (this.faseCodigo) lista = lista.filter((c) => c.faseCodigo === this.faseCodigo);

    const q = this.searchText.trim();
    if (!q) return lista;

    return lista.filter((c) =>
      SearchInput.matches(
        [c.codigo, c.nombre, c.puesto, c.area, c.empresa, c.proyectoObra, c.estadoNombre, c.correo]
          .filter(Boolean)
          .join(' '),
        q,
      ),
    );
  }

  get mensajeVacio(): string {
    return this.filtrosActivos > 0
      ? 'Sin resultados para los filtros aplicados.'
      : 'Aún no hay colaboradores en onboarding.';
  }

  // ── Paginación (cliente) ────────────────────────────────────────────────
  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredColaboradores);
  }

  get pagedColaboradores(): OnboardingListItem[] {
    return this.pager.page(this.filteredColaboradores);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Colores compartidos con las tarjetas de móvil ───────────────────────
  estadoColors = estadoOnboardingColors;
  avanceColor = avanceColor;
}
