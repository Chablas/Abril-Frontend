import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ROLES_EDITAN_PROYECTOS } from '../../../../../core/constants/proyecto-roles';
import { ProyectoService } from '../services/proyecto.service';
import { ProjectDto } from '../dtos/project.dto';
import { ProjectFilterDto } from '../dtos/project-filter.dto';
import { ProjectCatalogoDto } from '../dtos/project-init.dto';
import { ProyectoCreate } from './create/proyecto-create';
import { ProyectoEdit } from './edit/proyecto-edit';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { DEFAULT_PAGE_SIZE } from '../../../../../shared/constants/pagination';

import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';

@Component({
  selector: 'app-proyectos-config',
  imports: [
    CommonModule,
    ProyectoCreate,
    ProyectoEdit,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    StatusBadge,
    AbrilBulkActionDirective,
    Paginator,
  ],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css',
})
export class Proyectos implements OnInit {
  readonly tabs = CONFIGURACION_TABS;
  projects: PagedResponseDTO<ProjectDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  // Filtros — viven en el modal de filtros estándar que abre el botón del header.
  filters: ProjectFilterDto = {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ruc: '',
    razonSocial: '',
    projectDescription: '',
    active: null,
    projectTipoId: null,
    projectCicloVidaId: null,
  };
  filtrosAbiertos = false;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Catálogos de tipo y ciclo de vida: llegan con la carga inicial y los usan filtros y modales. */
  tipos: ProjectCatalogoDto[] = [];
  ciclosVida: ProjectCatalogoDto[] = [];
  tipoFilterOptions: { id: number | null; nombre: string }[] = [{ id: null, nombre: 'Todos' }];
  cicloVidaFilterOptions: { id: number | null; nombre: string }[] = [{ id: null, nombre: 'Todos' }];

  /** `active` es de sistema (si el proyecto aparece en filtros y desplegables), no el ciclo de vida. */
  readonly visibleFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Sí' },
    { value: false, label: 'No' },
  ];

  /** Colores de los badges por código de catálogo (DESIGN-VICTOR.md §6.3): lo que no es un
   *  proyecto de verdad resalta; un proyecto normal va en gris. */
  private static readonly BADGE_TIPO: Record<string, { bg: string; text: string }> = {
    PROYECTO: { bg: '#F1F5F9', text: '#334155' },
    FFT: { bg: '#FCE7F3', text: '#9D174D' },
    OFICINA_CENTRAL: { bg: '#CFFAFE', text: '#155E75' },
    AREA_INTERNA: { bg: '#FEF3C7', text: '#92400E' },
    PRUEBA: { bg: '#FFEDD5', text: '#9A3412' },
  };
  private static readonly BADGE_CICLO_VIDA: Record<string, { bg: string; text: string }> = {
    ACTIVO: { bg: '#DBEAFE', text: '#1E40AF' },
    FINALIZADO: { bg: '#DCFCE7', text: '#166534' },
    INACTIVO: { bg: '#F1F5F9', text: '#64748B' },
  };
  private static readonly BADGE_OTRO = { bg: '#F1F5F9', text: '#374151' };

  showCreateModal = false;
  showEditModal = false;
  selectedProject: ProjectDto | null = null;

  /** Crear, editar y eliminar: solo ROLES_EDITAN_PROYECTOS. El resto abre el mismo modal en solo lectura. */
  readonly puedeEditar: boolean;
  readonly botonNuevo = { label: 'Nuevo Proyecto', icono: 'ti-plus' };

  constructor(
    private proyectoService: ProyectoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    authService: AuthService,
  ) {
    this.puedeEditar = authService.hasAnyRole(ROLES_EDITAN_PROYECTOS);
  }

  ngOnInit(): void {
    this.init();
  }

  badgeTipo(codigo: string): { bg: string; text: string } {
    return Proyectos.BADGE_TIPO[codigo] ?? Proyectos.BADGE_OTRO;
  }

  badgeCicloVida(codigo: string): { bg: string; text: string } {
    return Proyectos.BADGE_CICLO_VIDA[codigo] ?? Proyectos.BADGE_OTRO;
  }

  /** Cantidad de filtros aplicados: la pinta el badge del botón "Filtros". */
  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.projectDescription.trim()) n++;
    if (this.filters.razonSocial.trim()) n++;
    if (this.filters.ruc.trim()) n++;
    if (this.filters.active !== null && this.filters.active !== undefined) n++;
    if (this.filters.projectTipoId != null) n++;
    if (this.filters.projectCicloVidaId != null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters.projectDescription = '';
    this.filters.razonSocial = '';
    this.filters.ruc = '';
    this.filters.active = null;
    this.filters.projectTipoId = null;
    this.filters.projectCicloVidaId = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.load(1);
  }

  /** Los campos de texto buscan en el servidor: se espera a que deje de escribir. */
  onSearchChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(1), 300);
  }

  openEditModal(project: ProjectDto, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedProject = project;
    this.showEditModal = true;
  }

  onModalClosed(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.selectedProject = null;
  }

  onModalSaved(): void {
    this.onModalClosed();
    this.load(this.currentPage);
  }

  /** Carga inicial: catálogos (filtros y modales) y la primera página en una sola petición. */
  private init(): void {
    this.loaderService.show();

    this.proyectoService.getInit({ ...this.filters, page: 1 }).subscribe({
      next: (response) => {
        this.tipos = response.tipos;
        this.ciclosVida = response.ciclosVida;
        this.tipoFilterOptions = [{ id: null, nombre: 'Todos' }, ...response.tipos];
        this.cicloVidaFilterOptions = [{ id: null, nombre: 'Todos' }, ...response.ciclosVida];
        this.aplicarPagina(response.proyectos);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private aplicarPagina(response: PagedResponseDTO<ProjectDto>): void {
    this.projects = response;
    this.currentPage = response.page;
    this.totalPages = response.totalPages;
    this.totalRecords = response.totalRecords;
  }

  load(page: number = 1): void {
    this.loaderService.show();

    this.proyectoService.getPaged({ ...this.filters, page }).subscribe({
      next: (response) => {
        this.aplicarPagina(response);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Baja lógica (soft delete): el backend deja el proyecto con state/active en false, no
   * borra la fila. Por eso el aviso no dice que se pierde nada.
   */
  deleteProject(projectId: number, event: MouseEvent): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      text: 'El proyecto dejará de aparecer en el sistema.',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();

      this.proyectoService.delete(projectId).subscribe({
        next: (response: ApiMessageDTO) => {
          this.loaderService.hide();
          this.load(this.currentPage);
          Swal.fire({
            title: '¡Eliminado!',
            text: response.message ?? 'El registro ha sido eliminado.',
            icon: 'success',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
