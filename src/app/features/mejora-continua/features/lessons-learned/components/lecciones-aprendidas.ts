import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeccionesAprendidasService } from '../services/lecciones-aprendidas.service';
import { LessonListDTO } from '../dtos/lessonList.model';
import { LessonFiltersDTO, CatalogFilterGroupDTO, CatalogFilterItemDTO } from '../dtos/lessonFilters.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { CreateLesson } from './create/create';
import { DetailLesson } from './detail/detail';
import { LessonList } from './list/list';
import { LessonCard } from './card/card';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ViewToggle } from '../../../../../shared/components/view-toggle/view-toggle';
import { ViewToggleMode } from '../../../../../shared/components/view-toggle/view-toggle.model';
import { environment } from '../../../../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-lecciones-aprendidas',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, CreateLesson, DetailLesson, LessonList, LessonCard, SearchSelect, ViewToggle],
  templateUrl: './lecciones-aprendidas.html',
})
export class LeccionesAprendidas implements OnInit {
  currentUserId = 0;
  apiUrl = environment.apiUrl;

  // List data
  lessons: LessonListDTO[] = [];
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  // Filters raw
  filtersData: LessonFiltersDTO = {
    projects: [], areas: [], periods: [], users: [], categories: [],
  };

  // Computed SearchSelect options (with null "Todos" prepended)
  projectOptions: any[] = [];
  areaOptions: any[] = [];
  userOptions: any[] = [];
  periodOptions: any[] = [];
  /**
   * Por cada catalog_type, las opciones del dropdown (con el "Todos" inicial).
   * Indexado por `catalogTypeId` para conservar el orden de catalog_type.
   */
  categoryOptions: { group: CatalogFilterGroupDTO; options: any[] }[] = [];

  filtersTable = {
    projectId: null as number | null,
    areaId: null as number | null,
    periodDate: null as string | null,
    userId: null as number | null,
    /** Selección por catalog_type_id → catalog_item_id (o null para "Todos"). */
    catalogSelections: {} as Record<number, number | null>,
    page: 1 as number | null,
  };
  showFilters = false;

  // View mode
  viewMode = 'table';
  viewModes: ViewToggleMode[] = [
    {
      value: 'table',
      label: 'Tabla',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>`,
    },
    {
      value: 'card',
      label: 'Tarjetas',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    },
  ];

  // Modals
  showCreateModal = false;
  selectedLessonId: number | null = null;
  selectedLessonTab: 'general' | 'images' = 'general';

  constructor(
    private leccionesAprendidasService: LeccionesAprendidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded: any = jwtDecode(token);
      this.currentUserId = Number(decoded.sub);
    }
    this.loadInitial();
  }

  private loadInitial(): void {
    this.loaderService.show();
    this.leccionesAprendidasService.getLessonsPagedWithFilters(this.buildQueryFilters()).subscribe({
      next: ({ paged, filters }) => {
        this.lessons = paged.data;
        this.filtersData = filters;
        this.currentPage = paged.page;
        this.totalPages = paged.totalPages;
        this.totalRecords = paged.totalRecords;
        this.buildFilterOptions(filters);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private buildFilterOptions(fd: LessonFiltersDTO): void {
    this.projectOptions = [{ projectId: null, projectDescription: 'Todos los proyectos' }, ...fd.projects];
    this.areaOptions = [{ areaId: null, areaDescription: 'Todas las areas' }, ...fd.areas];
    this.userOptions = [{ userId: null, fullName: 'Todos los usuarios' }, ...fd.users];
    this.periodOptions = [
      { periodDate: null, periodLabel: 'Todos los periodos' },
      ...fd.periods.map(p => ({
        periodDate: this.formatPeriodValue(p.periodDate),
        periodLabel: this.formatPeriodLabel(p.periodDate),
      })),
    ];

    // Dropdowns dinámicos por catalog_type. Inicializa la selección a null
    // (Todos) si todavía no había un valor en filtersTable.catalogSelections.
    this.categoryOptions = (fd.categories ?? []).map((group) => ({
      group,
      options: [
        { catalogItemId: null, catalogItemDescription: `Todos los ${group.catalogTypeName.toLowerCase()}` },
        ...group.items,
      ],
    }));
    for (const { group } of this.categoryOptions) {
      if (!(group.catalogTypeId in this.filtersTable.catalogSelections)) {
        this.filtersTable.catalogSelections[group.catalogTypeId] = null;
      }
    }
  }

  /** Setter usado por los dropdowns dinámicos del template. */
  onCatalogSelectionChange(catalogTypeId: number, value: number | null): void {
    this.filtersTable.catalogSelections[catalogTypeId] = value;
  }

  /** Valor actual de un dropdown dinámico (para que el template no haga indexación rara). */
  getCatalogSelection(catalogTypeId: number): number | null {
    return this.filtersTable.catalogSelections[catalogTypeId] ?? null;
  }

  /** Convierte el state a query params para el service (catalogItemIds como CSV). */
  private buildQueryFilters(): any {
    const selected = Object.values(this.filtersTable.catalogSelections)
      .filter((v): v is number => v != null);
    return {
      projectId: this.filtersTable.projectId,
      areaId: this.filtersTable.areaId,
      periodDate: this.filtersTable.periodDate,
      userId: this.filtersTable.userId,
      catalogItemIds: selected.length > 0 ? selected.join(',') : null,
      page: this.filtersTable.page,
    };
  }

  private formatPeriodValue(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatPeriodLabel(date: Date): string {
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  }

  loadLessons(page: number = 1): void {
    this.filtersTable.page = page;
    this.loaderService.show();
    this.leccionesAprendidasService.getLessonsUsingFilters(this.buildQueryFilters()).subscribe({
      next: (data) => {
        this.lessons = data.data;
        this.currentPage = data.page;
        this.totalPages = data.totalPages;
        this.totalRecords = data.totalRecords;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onSearch(): void {
    this.loadLessons(1);
  }

  downloadExcel(): void {
    this.loaderService.show();
    this.leccionesAprendidasService.getExcel(this.buildQueryFilters()).subscribe({
      next: (blob: Blob) => {
        const file = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Lecciones_Aprendidas.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openCreateModal(event: MouseEvent): void {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  onViewDetail(ev: { lessonId: number; tab: 'general' | 'images' }): void {
    this.selectedLessonId = ev.lessonId;
    this.selectedLessonTab = ev.tab;
  }

  onCardClick(lessonId: number): void {
    this.selectedLessonId = lessonId;
    this.selectedLessonTab = 'general';
  }
}
