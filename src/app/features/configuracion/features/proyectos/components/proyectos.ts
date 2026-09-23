import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ProyectoService } from '../services/proyecto.service';
import { ProjectDto } from '../dtos/project.dto';
import { ProjectFilterDto } from '../dtos/project-filter.dto';
import { ProyectoCreate } from './create/proyecto-create';
import { ProyectoEdit } from './edit/proyecto-edit';
import { ProyectoEmails } from './emails/proyecto-emails';
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
    ProyectoEmails,
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
  };
  filtrosAbiertos = false;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'ACTIVO' },
    { value: false, label: 'INACTIVO' },
  ];

  showCreateModal = false;
  showEditModal = false;
  showEmailsModal = false;
  selectedProject: ProjectDto | null = null;
  selectedEmailsProject: ProjectDto | null = null;

  constructor(
    private proyectoService: ProyectoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load(1);
  }

  /** Cantidad de filtros aplicados: la pinta el badge del botón "Filtros". */
  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.projectDescription.trim()) n++;
    if (this.filters.razonSocial.trim()) n++;
    if (this.filters.ruc.trim()) n++;
    if (this.filters.active !== null && this.filters.active !== undefined) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters.projectDescription = '';
    this.filters.razonSocial = '';
    this.filters.ruc = '';
    this.filters.active = null;
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

  openEmailsModal(project: ProjectDto, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedEmailsProject = project;
    this.showEmailsModal = true;
  }

  onModalClosed(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showEmailsModal = false;
    this.selectedProject = null;
    this.selectedEmailsProject = null;
  }

  onModalSaved(): void {
    this.onModalClosed();
    this.load(this.currentPage);
  }

  load(page: number = 1): void {
    this.loaderService.show();

    this.proyectoService.getPaged({ ...this.filters, page }).subscribe({
      next: (response) => {
        this.projects = response;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.totalRecords = response.totalRecords;
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
