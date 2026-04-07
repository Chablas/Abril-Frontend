import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { environment } from '../../../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-lecciones-aprendidas',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, CreateLesson, DetailLesson],
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

  // Filters
  filtersData: LessonFiltersDTO = {
    projects: [], areas: [], periods: [], phases: [],
    stages: [], layers: [], subStages: [], subSpecialties: [], users: [],
  };
  filtersTable = {
    projectId: null as number | null,
    areaId: null as number | null,
    periodDate: null as Date | null,
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
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
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

  openDetail(lessonId: number, event: MouseEvent, tab: 'general' | 'images'): void {
    event.stopPropagation();
    this.selectedLessonId = lessonId;
    this.selectedLessonTab = tab;
  }

  getOpportunityImages(images: any[]): any[] {
    return images?.filter(img => img.imageTypeDescription === 'OPORTUNIDAD') ?? [];
  }

  getImprovementImages(images: any[]): any[] {
    return images?.filter(img => img.imageTypeDescription === 'MEJORA') ?? [];
  }
}
