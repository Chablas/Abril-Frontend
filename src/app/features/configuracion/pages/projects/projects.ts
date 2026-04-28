import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../core/dtos/project/project.model';
import { ProjectQueryParams } from '../../../../core/dtos/project/projectQuery.model';
import { CatalogosSaludService } from '../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { ProjectEmailsForm } from '../../../projects/configuration/pages/proyectos/components/project-emails-form/project-emails-form';
import { ProjectEditForm } from './components/project-edit-form/project-edit-form';

interface FilterOption {
  id: string | number;
  nombre: string;
}

@Component({
  selector: 'app-config-projects',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    ProjectEmailsForm,
    ProjectEditForm,
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit, OnDestroy {
  readonly pageSize = 15;

  filters = {
    search: '',
    estado: '' as string,
    companyId: 0 as number,
  };

  estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'ACTIVO', nombre: 'ACTIVO' },
    { id: 'FINALIZADO', nombre: 'FINALIZADO' },
    { id: 'INACTIVO', nombre: 'INACTIVO' },
  ];

  empresas: EmpresaSimpleDto[] = [];
  empresaOptions: FilterOption[] = [{ id: 0, nombre: 'Todas las empresas' }];

  items: ProjectGetDTO[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  emailsModalOpen = false;
  emailsProjectId = 0;
  emailsProjectDescription = '';

  editModalOpen = false;
  editProject: ProjectGetDTO | null = null;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private projectService: ProjectService,
    private catalogos: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));

    this.catalogos.getEmpresas().subscribe({
      next: (res) => {
        this.empresas = res ?? [];
        this.empresaOptions = [
          { id: 0, nombre: 'Todas las empresas' },
          ...this.empresas.map((e) => ({ id: e.id, nombre: e.nombre })),
        ];
        this.cdr.detectChanges();
      },
    });

    this.load(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    const query: ProjectQueryParams = {
      page,
      pageSize: this.pageSize,
      search: this.filters.search?.trim() || undefined,
      estado: this.filters.estado || undefined,
      companyId: this.filters.companyId || undefined,
    };
    this.projectService.getProjectsPaged(query).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.load(1);
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '', companyId: 0 };
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openEmailsModal(project: ProjectGetDTO): void {
    this.emailsProjectId = project.projectId;
    this.emailsProjectDescription = project.projectDescription;
    this.emailsModalOpen = true;
  }

  closeEmailsModal(): void {
    this.emailsModalOpen = false;
    this.emailsProjectId = 0;
    this.emailsProjectDescription = '';
  }

  onEmailsSaved(): void {
    this.closeEmailsModal();
    this.load(this.currentPage);
  }

  openEditModal(project: ProjectGetDTO): void {
    this.editProject = project;
    this.editModalOpen = true;
  }

  closeEditModal(): void {
    this.editModalOpen = false;
    this.editProject = null;
  }

  onEditSaved(): void {
    this.closeEditModal();
    this.load(this.currentPage);
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  estadoBadgeClass(estado?: string): string {
    switch (estado) {
      case 'ACTIVO':
        return 'chip-green';
      case 'FINALIZADO':
        return 'chip-blue';
      case 'INACTIVO':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado || this.filters.companyId);
  }
}
