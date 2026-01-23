import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from "@angular/common";
import { HttpClientModule } from '@angular/common/http';
import { LessonService } from "../../../../services/lesson.service";
import { LessonListDTO } from "../../../../models/lesson.model";
import { LessonDetailDTO, LessonImageDTO } from "../../../../models/lessonDetail.model";
import { forkJoin } from 'rxjs';
import { LessonFiltersDTO } from "../../../../models/lessonFilters.model";
import { FormsModule } from '@angular/forms';
import { PhaseStageSubStageSubSpecialtyDTO, StageFilterDTO, SubStageFilterDTO, SubSpecialtyFilterDTO } from "../../../../models/phaseStageSubStageSubSpecialty.model";

@Component({
  selector: 'app-lecciones-aprendidas',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './lecciones-aprendidas.html',
  styleUrl: './lecciones-aprendidas.css',
})
export class LeccionesAprendidas implements OnInit {

  // Todos
  lessons: LessonListDTO[] = [];
  filtersData!: LessonFiltersDTO;
  filtersTable = {
    projectId: null as number | null,
    areaId: null as number | null,
  };
  loading = false;
  opportunityImages: LessonImageDTO[] = [];
  improvementImages: LessonImageDTO[] = [];

  // Modal
  showViewModal = false;
  showEditModal = false;
  detailLoading = false;

  // Modal Create
  showCreateModal = false;
  selectedPhaseId?: number;
  selectedStageId?: number;
  selectedSubStageId?: number;
  selectedSubSpecialtyId?: number;
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
  subSpecialties: SubSpecialtyFilterDTO[] = [];
  filtersPSSSCreateModal: PhaseStageSubStageSubSpecialtyDTO[] = [];
  saving = false;

  // Modal View or Create
  selectedLesson: LessonDetailDTO | null = null;
  activeTab: 'general' | 'images' = 'general';

  // Imágenes
  imageZoom: Record<number, number> = {};
  imagePos: Record<number, { x: number; y: number }> = {};
  draggingId: number | null = null;
  lastX = 0;
  lastY = 0;

  constructor(private lessonService: LessonService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loading = true;

    forkJoin({
      lessons: this.lessonService.getLessons(),
      filtersTable: this.lessonService.getFiltersInitialLoad()
    }).subscribe({
      next: ({ lessons, filtersTable }) => {
        this.lessons = lessons;
        this.filtersData = filtersTable;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }
  /*
  loadLessons(): void {
    this.loading = true;
    this.lessonService.getLessons().subscribe({
      next: data => {
        this.lessons = data;
        this.loading = false;
      },
      error: err => {
        console.error('Error loading lessons', err);
        this.loading = false;
      }
    });
  }*/

  openViewModal(id: number, event: MouseEvent, showActiveTab: 'general' | 'images') {
    event.stopPropagation();
    this.activeTab = showActiveTab;
    this.showViewModal = true;
    this.detailLoading = true;
    this.selectedLesson = null;

    this.lessonService.getById(id).subscribe({
      next: data => {
        this.selectedLesson = data;
        this.opportunityImages = data.images ?.filter(img => img.imageTypeDescription === 'OPORTUNIDAD') || [];
        this.improvementImages = data.images ?.filter(img => img.imageTypeDescription === 'MEJORA') || [];
        this.detailLoading = false;
        this.cdr.detectChanges();
        console.log(this.selectedLesson);
      },
      error: err => {
        console.error(err);
        this.detailLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.detailLoading = true;

    this.lessonService.getFiltersCreate().subscribe({
      next: data => {
        this.filtersPSSSCreateModal = data;
        this.phases = data;

        // limpiar selecciones
        this.stages = [];
        this.subStages = [];
        this.subSpecialties = [];

        this.selectedPhaseId = undefined;
        this.selectedStageId = undefined;
        this.selectedSubStageId = undefined;
        this.selectedSubSpecialtyId = undefined;

        this.detailLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error(err);
        this.detailLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPhaseChange() {
    const phase = this.filtersPSSSCreateModal.find(p => p.phaseId === this.selectedPhaseId);
    this.stages = phase ?.stages ?? [];

    this.subStages = [];
    this.subSpecialties = [];
    this.selectedStageId = undefined;
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  }

  onStageChange() {
    const stage = this.stages.find(s => s.stageId === this.selectedStageId);
    this.subStages = stage ?.subStages ?? [];

    this.subSpecialties = [];
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  }

  onSubStageChange() {
    const subStage = this.subStages.find(ss => ss.subStageId === this.selectedSubStageId);
    this.subSpecialties = subStage ?.subSpecialties ?? [];

    this.selectedSubSpecialtyId = undefined;
  }

  openEditModal(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.activeTab = 'general';
    this.showEditModal = true;
    this.detailLoading = true;
    this.selectedLesson = null;

    this.lessonService.getById(id).subscribe({
      next: data => {
        this.selectedLesson = data;
        this.opportunityImages = data.images ?.filter(img => img.imageTypeDescription === 'OPORTUNIDAD') || [];
        this.improvementImages = data.images ?.filter(img => img.imageTypeDescription === 'MEJORA') || [];
        this.detailLoading = false;
        this.cdr.detectChanges();
        console.log(this.selectedLesson);
      },
      error: err => {
        console.error(err);
        this.detailLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeModal() {
    this.showViewModal = false;
    this.showEditModal = false;
    this.selectedLesson = null;
    this.detailLoading = false;
    this.showCreateModal = false;
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
    this.loading = true;

    this.lessonService.getLessonsUsingFilters(this.filtersTable).subscribe({
      next: data => {
        this.lessons = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading lessons with filters', err);
        this.loading = false;
      }
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
    if (!e.dataTransfer ?.files) return;
    this.handleFiles(e.dataTransfer.files, type);
  }

  onFilesSelected(e: Event, type: 'opportunity' | 'improvement') {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    this.handleFiles(input.files, type);
  }

  private handleFiles(fileList: FileList, type: 'opportunity' | 'improvement') {
    Array.from(fileList).forEach(file => {
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

  submitLesson() {
    if (!this.filtersTable.areaId || !this.selectedPhaseId) {
      // validaciones mínimas
      alert('Área y Fase son obligatorias');
      return;
    }

    const form = new FormData();

    // campos de texto
    form.append('ProblemDescription', this.problemDescription ?? '');
    form.append('ReasonDescription', this.reasonDescription ?? '');
    form.append('LessonDescription', this.lessonDescription ?? '');
    form.append('ImpactDescription', this.impactDescription ?? '');

    // ids
    if (this.filtersTable.projectId)
      form.append('ProjectId', String(this.filtersTable.projectId));

    form.append('AreaId', String(this.filtersTable.areaId));
    form.append('PhaseId', String(this.selectedPhaseId));

    if (this.selectedStageId)
      form.append('StageId', String(this.selectedStageId));

    if (this.selectedSubStageId)
      form.append('SubStageId', String(this.selectedSubStageId));

    if (this.selectedSubSpecialtyId)
      form.append('SubSpecialtyId', String(this.selectedSubSpecialtyId));

    // imágenes
    this.opportunityFiles.forEach(f => {
      form.append('OpportunityImages', f);
    });

    this.improvementFiles.forEach(f => {
      form.append('ImprovementImages', f);
    });

    this.saving = true;

    this.lessonService.createLesson(form).subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.resetForm();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error(err);
        this.saving = false;
      }
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
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  
    this.opportunityFiles = [];
    this.improvementFiles = [];
    this.opportunityPreviews = [];
    this.improvementPreviews = [];
  }

}