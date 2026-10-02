import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { AuthService } from '../../../../../core/services/auth.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { PROJECTS_TABS } from '../../../shared/projects-tabs';
import { ContratosService } from '../../services/contratos.service';
import { ContratoCatalogosDTO, ProjectContractDTO } from '../../dtos/contrato.dtos';
import {
  CONTRATOS_FEATURE_EDITAR,
  CONTRATO_PASOS,
  TOTAL_PASOS,
  estadoBadge,
  nombrePaso,
} from '../../constants/contrato-pasos';
import { ContratoForm } from '../../components/contrato-form/contrato-form';
import { ContratoDetalle } from '../../components/contrato-detalle/contrato-detalle';
import { ContratoCarpeta } from '../../components/contrato-carpeta/contrato-carpeta';

/**
 * Contratos de locación de servicios con consultores de diseño (Unidad de Proyectos), por
 * proyecto. Entrar a la página = 1 GET (catálogos, que incluyen los proyectos); elegir un proyecto
 * = 1 GET (sus contratos). Crear/editar/avanzar pasos no recarga la lista: cada mutación actualiza
 * el contrato en memoria (ver ContratoForm / ContratoDetalle).
 */
@Component({
  selector: 'app-contratos-lista',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    Paginator,
    TitleCasePipe,
    ContratoForm,
    ContratoDetalle,
    ContratoCarpeta,
  ],
  templateUrl: './contratos-lista.html',
  styleUrls: ['../../shared/contratos-ui.css', './contratos-lista.css'],
})
export class ContratosLista implements OnInit {
  readonly tabs = PROJECTS_TABS;
  readonly totalPasos = TOTAL_PASOS;
  readonly nombrePaso = nombrePaso;
  readonly estadoBadge = estadoBadge;
  readonly estadoOptions = CONTRATO_PASOS.map((label, i) => ({ value: i + 1, label: `${i + 1}. ${label}` }));

  readonly puedeEditar: boolean;

  catalogos: ContratoCatalogosDTO | null = null;
  loadingCatalogos = true;

  projectId: number | null = null;
  contratos: ProjectContractDTO[] = [];
  loadingContratos = false;

  // ── Filtros ────────────────────────────────────────────────────────────────
  filtrosAbiertos = false;
  searchText = '';
  estadoFilter: number | null = null;
  private readonly pager = new ClientPager<ProjectContractDTO>();

  // ── Modales ────────────────────────────────────────────────────────────────
  showCrear = false;
  contratoEditar: ProjectContractDTO | null = null;
  contratoDetalle: ProjectContractDTO | null = null;
  detalleRequiereCarga = true;
  showCarpeta = false;

  constructor(
    private service: ContratosService,
    private errorService: ErrorService,
    authService: AuthService,
  ) {
    this.puedeEditar = authService.hasFeature(CONTRATOS_FEATURE_EDITAR);
  }

  ngOnInit(): void {
    this.service.getCatalogos().subscribe({
      next: (data) => {
        // app-search-select no ordena sus opciones: listas sin orden propio van alfabéticas.
        data.projects.sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        data.workSpecialties.sort((a, b) => a.workSpecialtyDescription.localeCompare(b.workSpecialtyDescription));
        this.catalogos = data;
        this.loadingCatalogos = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
      },
    });
  }

  get projectName(): string {
    return this.catalogos?.projects.find((p) => p.projectId === this.projectId)?.projectDescription ?? '';
  }

  get hayModalAbierto(): boolean {
    return this.showCrear || !!this.contratoEditar || !!this.contratoDetalle || this.showCarpeta || this.filtrosAbiertos;
  }

  /** El FAB de "Nuevo contrato" se oculta mientras hay un modal abierto para no taparlo. */
  get botonNuevo(): { label: string; icono: string } | undefined {
    return this.puedeEditar && !this.hayModalAbierto ? { label: 'Nuevo contrato', icono: 'ti-plus' } : undefined;
  }

  // ── Proyecto ───────────────────────────────────────────────────────────────

  onProjectChange(projectId: number | null): void {
    if (projectId === this.projectId) return;
    this.projectId = projectId;
    this.contratos = [];
    this.pager.reset();
    if (projectId) this.cargarContratos(projectId);
  }

  private cargarContratos(projectId: number): void {
    this.loadingContratos = true;
    this.service.getByProject(projectId).subscribe({
      next: (data) => {
        // Si el usuario cambió de proyecto mientras cargaba, esta respuesta ya no aplica.
        if (projectId !== this.projectId) return;
        this.contratos = data;
        this.loadingContratos = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loadingContratos = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Filtros + paginación ───────────────────────────────────────────────────

  get filtrosActivos(): number {
    // El proyecto no cuenta: es el contexto de la página (va en el subtítulo), no un filtro que
    // "Limpiar filtros" pueda quitar.
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.estadoFilter !== null) n++;
    return n;
  }

  /** Limpia búsqueda y estado; el proyecto se mantiene (sin él no hay lista que mostrar). */
  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredContratos(): ProjectContractDTO[] {
    const q = this.searchText.trim();
    return this.contratos.filter((c) => {
      const texto = [
        c.contractorName,
        c.workSpecialtyDescription,
        c.serviceDescription,
        c.contractNumber != null ? String(c.contractNumber) : '',
      ].join(' ');
      const matchesTexto = !q || SearchInput.matches(texto, q);
      const matchesEstado = this.estadoFilter === null || c.projectContractStatusId === this.estadoFilter;
      return matchesTexto && matchesEstado;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredContratos);
  }

  get pagedContratos(): ProjectContractDTO[] {
    return this.pager.page(this.filteredContratos);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Acciones ───────────────────────────────────────────────────────────────

  abrirCrear(): void {
    if (!this.puedeEditar) return;
    if (!this.projectId) {
      this.filtrosAbiertos = true;
      return;
    }
    this.showCrear = true;
  }

  onCreado(contrato: ProjectContractDTO): void {
    this.showCrear = false;
    // Mismo orden que el backend (más recientes primero).
    this.contratos = [contrato, ...this.contratos];
    this.pager.reset();
    // Se abre directo en el detalle para seguir con los hitos; ya está completo, sin GET.
    this.detalleRequiereCarga = false;
    this.contratoDetalle = contrato;
  }

  abrirDetalle(contrato: ProjectContractDTO): void {
    this.detalleRequiereCarga = true;
    this.contratoDetalle = contrato;
  }

  abrirCarpeta(): void {
    if (this.projectId) this.showCarpeta = true;
  }

  trackById(_: number, c: ProjectContractDTO): number {
    return c.projectContractId;
  }
}
