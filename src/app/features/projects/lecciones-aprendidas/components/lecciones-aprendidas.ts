import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { LessonService } from '../../../../core/services/lesson.service';
import { LessonListDTO } from '../../../../core/dtos/lesson/lesson.model';
import { LessonFiltersDTO } from '../../../../core/dtos/lesson/lessonFilters.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { CreateLesson } from './create/create';
import { DetailLesson } from './detail/detail';
import { LessonList } from './list/list';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { environment } from '../../../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-lecciones-aprendidas',
  standalone: true,
  imports: [CommonModule, Paginator, CreateLesson, DetailLesson, LessonList, SearchSelect],
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
    projects: [], areas: [], periods: [], phases: [],
    stages: [], layers: [], subStages: [], subSpecialties: [], users: [],
  };

  // Computed SearchSelect options (with null "Todos" prepended)
  projectOptions: any[] = [];
  areaOptions: any[] = [];
  phaseOptions: any[] = [];
  stageOptions: any[] = [];
  layerOptions: any[] = [];
  subStageOptions: any[] = [];
  subSpecialtyOptions: any[] = [];
  userOptions: any[] = [];
  periodOptions: any[] = [];

  filtersTable = {
    projectId: null as number | null,
    areaId: null as number | null,
    periodDate: null as string | null,
    phaseId: null as number | null,
    stageId: null as number | null,
    layerId: null as number | null,
    subStageId: null as number | null,
    subSpecialtyId: null as number | null,
    userId: null as number | null,
    page: 1 as number | null,
  };
  showFilters = false;

  // Modals
  showCreateModal = false;
  selectedLessonId: number | null = null;
  selectedLessonTab: 'general' | 'images' = 'general';

  constructor(
    private lessonService: LessonService,
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
    forkJoin({
      lessons: this.lessonService.getLessonsUsingFilters(this.filtersTable),
      filtersData: this.lessonService.getFilters(),
    }).subscribe({
      next: ({ lessons, filtersData }) => {
        this.lessons = lessons.data;
        this.filtersData = filtersData;
        this.currentPage = lessons.page;
        this.totalPages = lessons.totalPages;
        this.totalRecords = lessons.totalRecords;
        this.buildFilterOptions(filtersData);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private buildFilterOptions(fd: LessonFiltersDTO): void {
    this.projectOptions = [{ projectId: null, projectDescription: 'Todos los proyectos' }, ...fd.projects];
    this.areaOptions = [{ areaId: null, areaDescription: 'Todas las areas' }, ...fd.areas];
    this.phaseOptions = [{ phaseId: null, phaseDescription: 'Todas las fases' }, ...(fd.phases ?? [])];
    this.stageOptions = [{ stageId: null, stageDescription: 'Todas las etapas' }, ...(fd.stages ?? [])];
    this.layerOptions = [{ layerId: null, layerDescription: 'Todos los niveles' }, ...(fd.layers ?? [])];
    this.subStageOptions = [{ subStageId: null, subStageDescription: 'Todas las subetapas' }, ...(fd.subStages ?? [])];
    this.subSpecialtyOptions = [{ subSpecialtyId: null, subSpecialtyDescription: 'Todas' }, ...(fd.subSpecialties ?? [])];
    this.userOptions = [{ userId: null, fullName: 'Todos los usuarios' }, ...fd.users];
    this.periodOptions = [
      { periodDate: null, periodLabel: 'Todos los periodos' },
      ...fd.periods.map(p => ({
        periodDate: this.formatPeriodValue(p.periodDate),
        periodLabel: this.formatPeriodLabel(p.periodDate),
      })),
    ];
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
    this.lessonService.getLessonsUsingFilters(this.filtersTable).subscribe({
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
    this.lessonService.getExcel(this.filtersTable).subscribe({
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
}
