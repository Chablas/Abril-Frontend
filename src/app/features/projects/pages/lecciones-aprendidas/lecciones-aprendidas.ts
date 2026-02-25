import { Component, OnInit, ChangeDetectorRef, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { CommonModule } from "@angular/common";
import { HttpClientModule } from '@angular/common/http';
import { LessonService } from "../../../../core/services/lesson.service";
import { PhaseStageSubStageSubSpecialtyService } from "../../../../core/services/phaseStageSubStageSubSpecialty.service";
import { LessonListDTO, LessonListPagedDTO } from "../../../../core/dtos/lesson/lesson.model";
import { LessonDetailDTO, LessonImageDTO } from "../../../../core/dtos/lesson/lessonDetail.model";
import { forkJoin } from 'rxjs';
import { LessonFiltersDTO } from "../../../../core/dtos/lesson/lessonFilters.model";
import { FormsModule } from '@angular/forms';
import { PhaseStageSubStageSubSpecialtyDTO, StageFilterDTO, SubStageFilterDTO, SubSpecialtyFilterDTO, LayerFilterDTO } from "../../../../core/dtos/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialty.model";
import { environment } from '../../../../../environments/environment';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from "@angular/router";
import Swal from 'sweetalert2';
import { ApiMessageDTO } from "../../../../core/dtos/api/ApiMessage.model";
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-lecciones-aprendidas',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './lecciones-aprendidas.html',
  styleUrl: './lecciones-aprendidas.css',
})
export class LeccionesAprendidas implements OnInit {
  currentUserId: number = 0;
  // Todos
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  lessons: LessonListPagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  filtersData: LessonFiltersDTO = {
    projects: [],
    areas: [],
    periods: [],
    phases: [],
    stages: [],
    layers: [],
    subStages: [],
    subSpecialties: [],
    users: []
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
    page: null as number | null,
  };
  loader = false;
  opportunityImages: LessonImageDTO[] = [];
  improvementImages: LessonImageDTO[] = [];
  apiUrl = environment.apiUrl;

  // Modal
  showViewModal = false;
  showEditModal = false;

  // Modal Create
  showCreateModal = false;
  selectedPhaseId?: number;
  selectedStageId?: number;
  selectedSubStageId?: number;
  selectedSubSpecialtyId?: number;
  selectedLayerId?: number;
  problemDescription = '';
  reasonDescription = '';
  lessonDescription = '';
  impactDescription = '';
  opportunityPreviews: string[] = [];
  opportunityFiles: File[] = [];
  improvementPreviews: string[] = [];
  improvementFiles: File[] = [];
  phases: PhaseStageSubStageSubSpecialtyDTO[] = [];
  stages: StageFilterDTO[] = [];
  subStages: SubStageFilterDTO[] = [];
  layers: LayerFilterDTO[] = [];
  subSpecialties: SubSpecialtyFilterDTO[] = [];
  filtersPSSSCreateModal: PhaseStageSubStageSubSpecialtyDTO[] = [];

  showFilters = false;

  // Modal View or Create
  selectedLesson: LessonDetailDTO | null = null;
  activeTab: 'general' | 'images' = 'general';
  @ViewChildren('autoTextarea') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;

  // Imágenes
  imageZoom: Record<number, number> = {};
  imagePos: Record<number, { x: number; y: number }> = {};
  draggingId: number | null = null;
  lastX = 0;
  lastY = 0;

  constructor(
    private lessonService: LessonService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded: any = jwtDecode(token);
      this.currentUserId = Number(decoded.sub);
    }
    this.loadLessons();
  }

  loadLessons(page: number = 1): void {
    this.loader = true;
    this.cdr.detectChanges();
    this.filtersTable.page = page;

    forkJoin({
      lessons: this.lessonService.getLessonsUsingFilters(this.filtersTable),
      filtersData: this.lessonService.getFilters(),
    }).subscribe({
      next: ({ lessons, filtersData }) => {
        this.lessons = lessons;
        this.filtersData = filtersData;
        this.currentPage = lessons.page;
        this.totalPages = lessons.totalPages;
        this.pageSize = lessons.pageSize;
        this.totalRecords = lessons.totalRecords;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  openViewModal(id: number, event: MouseEvent, showActiveTab: 'general' | 'images') {
    event.stopPropagation();
    this.activeTab = showActiveTab;
    this.showViewModal = true;
    this.loader = true;
    this.selectedLesson = null;
    this.cdr.detectChanges();

    this.lessonService.getById(id).subscribe({
      next: (data) => {
        this.selectedLesson = data;
        this.opportunityImages =
          data.images?.filter((img) => img.imageTypeDescription === 'OPORTUNIDAD') || [];
        this.improvementImages =
          data.images?.filter((img) => img.imageTypeDescription === 'MEJORA') || [];
        this.loader = false;
        setTimeout(() => {
          this.adjustTextAreaHeight();
        });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.loader = true;

    this.lessonService.getFiltersCreate().subscribe({
      next: (data) => {
        this.filtersPSSSCreateModal = data;
        this.phases = data;

        // limpiar selecciones
        this.stages = [];
        this.subStages = [];
        this.subSpecialties = [];
        this.layers = [];

        this.selectedPhaseId = undefined;
        this.selectedStageId = undefined;
        this.selectedSubStageId = undefined;
        this.selectedSubSpecialtyId = undefined;
        this.selectedLayerId = undefined;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.showViewModal = false;
      this.showCreateModal = false;
      this.showEditModal = false;
      this.selectedLesson = null;
      this.activeTab = 'general';
      return;
    }
    if (event.target === event.currentTarget) {
      this.showViewModal = false;
      this.showCreateModal = false;
      this.showEditModal = false;
      this.selectedLesson = null;
      this.activeTab = 'general';
    }
  }

  adjustTextAreaHeight() {
    if (!this.textareas) return;

    this.textareas.forEach((textareaRef) => {
      const el = textareaRef.nativeElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }

  onPhaseChange() {
    const phase = this.filtersPSSSCreateModal.find((p) => p.phaseId === this.selectedPhaseId);

    this.stages = phase?.stages ?? [];

    this.layers = [];
    this.subStages = [];
    this.subSpecialties = [];

    this.selectedStageId = undefined;
    this.selectedLayerId = undefined;
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  }

  onStageChange() {
    const stage = this.stages.find((s) => s.stageId === this.selectedStageId);

    this.layers = stage?.layers ?? [];

    if (this.layers.length === 0) {
      // Stage SIN Layer
      this.subStages = stage?.subStages ?? [];
    } else {
      // Stage CON Layer
      this.subStages = [];
    }

    this.subSpecialties = [];

    this.selectedLayerId = undefined;
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  }

  onSubStageChange() {
    const subStage = this.subStages.find((ss) => ss.subStageId === this.selectedSubStageId);
    this.subSpecialties = subStage?.subSpecialties ?? [];

    this.selectedSubSpecialtyId = undefined;
  }

  onLayerChange() {
    const layer = this.layers.find((l) => l.layerId === this.selectedLayerId);

    this.subStages = layer?.subStages ?? [];
    this.subSpecialties = [];

    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  }

  openEditModal(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.activeTab = 'general';
    this.showEditModal = true;
    this.loader = true;
    this.selectedLesson = null;
    this.cdr.detectChanges();

    this.lessonService.getById(id).subscribe({
      next: (data) => {
        this.selectedLesson = data;
        this.opportunityImages =
          data.images?.filter((img) => img.imageTypeDescription === 'OPORTUNIDAD') || [];
        this.improvementImages =
          data.images?.filter((img) => img.imageTypeDescription === 'MEJORA') || [];
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  setSelectedLessonImages() {
    if (!this.selectedLesson?.images) {
      this.opportunityImages = [];
      this.improvementImages = [];
      return;
    }

    this.opportunityImages = this.selectedLesson.images.filter(
      (img) => img.imageTypeDescription === 'OPORTUNIDAD',
    );

    this.improvementImages = this.selectedLesson.images.filter(
      (img) => img.imageTypeDescription === 'MEJORA',
    );
  }

  onWheelZoom(event: WheelEvent, imgId: number) {
    event.preventDefault();

    if (!this.imageZoom[imgId]) {
      this.imageZoom[imgId] = 1;
    }
    if (!this.imagePos[imgId]) {
      this.imagePos[imgId] = { x: 0, y: 0 };
    }

    const currentZoom = this.imageZoom[imgId];

    const baseStep = 0.05;

    const dynamicStep = baseStep * currentZoom;

    const delta = event.deltaY < 0 ? dynamicStep : -dynamicStep;

    this.imageZoom[imgId] = Math.max(0.1, currentZoom + delta);
  }

  onMouseDown(event: MouseEvent, imgId: number) {
    this.draggingId = imgId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  onMouseMove(event: MouseEvent) {
    if (this.draggingId === null) return;

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;

    const zoom = this.imageZoom[this.draggingId] || 1;
    const pos = this.imagePos[this.draggingId];

    // A menor zoom -> movimiento más rápido
    // A mayor zoom -> movimiento más lento
    const speedFactor = 1 / zoom;

    pos.x += dx * speedFactor;
    pos.y += dy * speedFactor;

    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  onMouseUp() {
    this.draggingId = null;
  }

  onSearch(): void {
    this.loader = true;
    this.cdr.detectChanges();
    this.filtersTable.page = 1;
    this.lessonService.getLessonsUsingFilters(this.filtersTable).subscribe({
      next: (data) => {
        this.lessons = data;
        this.loader = false;
        this.currentPage = data.page;
        this.totalPages = data.totalPages;
        this.pageSize = data.pageSize;
        this.totalRecords = data.totalRecords;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
  }

  onDrop(e: DragEvent, type: 'opportunity' | 'improvement') {
    e.preventDefault();
    if (!e.dataTransfer?.files) return;
    this.handleFiles(e.dataTransfer.files, type);
  }

  onFilesSelected(e: Event, type: 'opportunity' | 'improvement') {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    this.handleFiles(input.files, type);
  }

  private handleFiles(fileList: FileList, type: 'opportunity' | 'improvement') {
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'opportunity') {
          this.opportunityFiles.push(file);
          this.opportunityPreviews.push(reader.result as string);
        } else {
          this.improvementFiles.push(file);
          this.improvementPreviews.push(reader.result as string);
        }

        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number, type: 'opportunity' | 'improvement'): void {
    if (type === 'opportunity') {
      this.opportunityFiles.splice(index, 1);
      this.opportunityPreviews.splice(index, 1);
    } else {
      this.improvementFiles.splice(index, 1);
      this.improvementPreviews.splice(index, 1);
    }

    this.cdr.detectChanges();
  }

  getOpportunityImages(images: any[]): any[] {
    return images?.filter((img) => img.imageTypeDescription === 'OPORTUNIDAD') ?? [];
  }

  getImprovementImages(images: any[]): any[] {
    return images?.filter((img) => img.imageTypeDescription === 'MEJORA') ?? [];
  }

  submitLesson() {
    this.loader = true;
    this.cdr.detectChanges();
    if (!this.filtersTable.projectId) {
      this.loader = false;
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Seleccionar proyecto',
      });
      return;
    }

    if (!this.filtersTable.areaId) {
      this.loader = false;
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Seleccionar área',
      });
      return;
    }

    if (!this.selectedPhaseId) {
      this.loader = false;
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Seleccionar fase',
      });
      return;
    }

    if (!this.problemDescription) {
      this.loader = false;
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese una descripción.',
      });
      return;
    }

    if (!this.reasonDescription) {
      this.loader = false;
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese una causa.',
      });
      return;
    }

    if (!this.lessonDescription) {
      this.loader = false;
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese una lección/propuesta.',
      });
      return;
    }

    if (!this.impactDescription) {
      this.loader = false;
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese un impacto.',
      });
      return;
    }

    const form = new FormData();

    form.append('ProblemDescription', this.problemDescription ?? '');
    form.append('ReasonDescription', this.reasonDescription ?? '');
    form.append('LessonDescription', this.lessonDescription ?? '');
    form.append('ImpactDescription', this.impactDescription ?? '');

    // ids
    if (this.filtersTable.projectId) form.append('ProjectId', String(this.filtersTable.projectId));

    form.append('AreaId', String(this.filtersTable.areaId));
    form.append('PhaseId', String(this.selectedPhaseId));

    if (this.selectedStageId) form.append('StageId', String(this.selectedStageId));

    if (this.selectedLayerId) form.append('LayerId', String(this.selectedLayerId));

    if (this.selectedSubStageId) form.append('SubStageId', String(this.selectedSubStageId));

    if (this.selectedSubSpecialtyId)
      form.append('SubSpecialtyId', String(this.selectedSubSpecialtyId));

    this.opportunityFiles.forEach((f) => {
      form.append('OpportunityImages', f);
    });

    this.improvementFiles.forEach((f) => {
      form.append('ImprovementImages', f);
    });

    this.lessonService.createLesson(form).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loader = false;
        this.cdr.detectChanges();
        this.resetForm();
        this.loadLessons();
        Swal.fire({
          title: 'Lección creada exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  deleteLesson(lessonId: number | undefined, event: MouseEvent) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loader = true;
        this.lessonService.deleteLesson(lessonId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadLessons();
            this.loader = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: '¡Eliminado!',
              text: response.message ?? 'El registro ha sido eliminado.',
              confirmButtonColor: '#64BC04',
              icon: 'success',
            });
          },
          error: (err: HttpErrorResponse) => {
            this.error(err);
          },
        });
      }
    });
  }

  viewFilters() {
    this.showFilters = !this.showFilters;
    this.cdr.detectChanges();
  }

  downloadExcel() {
    this.loader = true;
    this.cdr.detectChanges();
    this.lessonService.getExcel(this.filtersTable).subscribe({
      next: (blob: Blob) => {
        const file = new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = window.URL.createObjectURL(file);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'Lecciones_Aprendidas.xlsx';
        a.click();

        window.URL.revokeObjectURL(url);
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  private resetForm() {
    this.problemDescription = '';
    this.reasonDescription = '';
    this.lessonDescription = '';
    this.impactDescription = '';

    this.filtersTable.projectId = null;
    this.filtersTable.areaId = null;
    this.selectedPhaseId = undefined;
    this.selectedStageId = undefined;
    this.selectedLayerId = undefined;
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;

    this.opportunityFiles = [];
    this.improvementFiles = [];
    this.opportunityPreviews = [];
    this.improvementPreviews = [];
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadLessons(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadLessons(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadLessons(page);
      this.cdr.detectChanges();
    }
  }

  get pages(): number[] {
    const maxButtons = 5;

    if (this.totalPages <= maxButtons) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    let start = this.currentPage - Math.floor(maxButtons / 2);
    let end = this.currentPage + Math.floor(maxButtons / 2);

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }

    if (end > this.totalPages) {
      end = this.totalPages;
      start = this.totalPages - maxButtons + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    const validationError = err.error?.errors ? (Object.values(err.error.errors as Record<string, string[]>)[0]?.[0]) : null;
    const message = validationError || err.error?.message || 'Ocurrió un error.';

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: message,
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: message,
      });
      return;
    }
  }
}