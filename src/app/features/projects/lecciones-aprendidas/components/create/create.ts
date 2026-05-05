import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { ImagePreview } from '../../../../../shared/components/image-preview/image-preview';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LessonService } from '../../../../../core/services/lesson.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { LessonFiltersDTO } from '../../dtos/lessonFilters.model';
import {
  PhaseStageSubStageSubSpecialtyDTO,
  StageFilterDTO,
  SubStageFilterDTO,
  SubSpecialtyFilterDTO,
  LayerFilterDTO,
} from '../../../../../core/dtos/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialty.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create-lesson',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, FileSelector, ImagePreview, SearchSelect],
  templateUrl: './create.html',
})
export class CreateLesson implements OnInit {
  @Input() filtersData!: LessonFiltersDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // Own form state (separate from list filters - fixes shared-state bug)
  projectId: number = 0;
  areaId: number = 0;

  // Cascading selects
  private psssData: PhaseStageSubStageSubSpecialtyDTO[] = [];
  phases: PhaseStageSubStageSubSpecialtyDTO[] = [];
  stages: StageFilterDTO[] = [];
  layers: LayerFilterDTO[] = [];
  subStages: SubStageFilterDTO[] = [];
  subSpecialties: SubSpecialtyFilterDTO[] = [];

  selectedPhaseId?: number;
  selectedStageId?: number;
  selectedLayerId?: number;
  selectedSubStageId?: number;
  selectedSubSpecialtyId?: number;

  // Text fields
  problemDescription = '';
  reasonDescription = '';
  lessonDescription = '';
  impactDescription = '';

  // Images
  opportunityPreviews: string[] = [];
  opportunityFiles: File[] = [];
  improvementPreviews: string[] = [];
  improvementFiles: File[] = [];

  constructor(
    private lessonService: LessonService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadPSSSData();
  }

  private loadPSSSData(): void {
    this.loaderService.show();
    this.lessonService.getFiltersCreate().subscribe({
      next: (data) => {
        this.psssData = data;
        this.phases = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onPhaseChange(): void {
    const phase = this.psssData.find(p => p.phaseId === this.selectedPhaseId);
    this.stages = phase?.stages ?? [];
    this.layers = [];
    this.subStages = [];
    this.subSpecialties = [];
    this.selectedStageId = undefined;
    this.selectedLayerId = undefined;
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  }

  onStageChange(): void {
    const stage = this.stages.find(s => s.stageId === this.selectedStageId);
    this.layers = stage?.layers ?? [];
    this.subStages = this.layers.length === 0 ? (stage?.subStages ?? []) : [];
    this.subSpecialties = [];
    this.selectedLayerId = undefined;
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  }

  onLayerChange(): void {
    const layer = this.layers.find(l => l.layerId === this.selectedLayerId);
    this.subStages = layer?.subStages ?? [];
    this.subSpecialties = [];
    this.selectedSubStageId = undefined;
    this.selectedSubSpecialtyId = undefined;
  }

  onSubStageChange(): void {
    const subStage = this.subStages.find(ss => ss.subStageId === this.selectedSubStageId);
    this.subSpecialties = subStage?.subSpecialties ?? [];
    this.selectedSubSpecialtyId = undefined;
  }

  onFileSelected(image: SelectedFile, type: 'opportunity' | 'improvement'): void {
    if (type === 'opportunity') {
      this.opportunityFiles.push(image.file);
      this.opportunityPreviews.push(image.preview);
    } else {
      this.improvementFiles.push(image.file);
      this.improvementPreviews.push(image.preview);
    }
  }

  removeImage(index: number, type: 'opportunity' | 'improvement'): void {
    if (type === 'opportunity') {
      this.opportunityFiles.splice(index, 1);
      this.opportunityPreviews.splice(index, 1);
    } else {
      this.improvementFiles.splice(index, 1);
      this.improvementPreviews.splice(index, 1);
    }
  }

  submit(): void {
    if (!this.projectId) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccionar proyecto' }); return; }
    if (!this.areaId) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccionar area' }); return; }
    if (!this.selectedPhaseId) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccionar fase' }); return; }
    if (!this.problemDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese una descripcion' }); return; }
    if (!this.reasonDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese las causas' }); return; }
    if (!this.lessonDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese la leccion aprendida' }); return; }
    if (!this.impactDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese el impacto' }); return; }

    const form = new FormData();
    form.append('ProjectId', String(this.projectId));
    form.append('AreaId', String(this.areaId));
    form.append('PhaseId', String(this.selectedPhaseId));
    if (this.selectedStageId) form.append('StageId', String(this.selectedStageId));
    if (this.selectedLayerId) form.append('LayerId', String(this.selectedLayerId));
    if (this.selectedSubStageId) form.append('SubStageId', String(this.selectedSubStageId));
    if (this.selectedSubSpecialtyId) form.append('SubSpecialtyId', String(this.selectedSubSpecialtyId));
    form.append('ProblemDescription', this.problemDescription);
    form.append('ReasonDescription', this.reasonDescription);
    form.append('LessonDescription', this.lessonDescription);
    form.append('ImpactDescription', this.impactDescription);
    this.opportunityFiles.forEach(f => form.append('OpportunityImages', f));
    this.improvementFiles.forEach(f => form.append('ImprovementImages', f));

    this.loaderService.show();
    this.lessonService.createLesson(form).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: 'Leccion creada exitosamente', icon: 'success', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
