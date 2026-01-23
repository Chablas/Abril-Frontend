import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { LessonService } from "../../../../../services/lesson.service";
import { PhaseStageSubStageSubSpecialtyShowFormDataDTO } from "../../../../../models/phaseStageSubStageSubSpecialtyFormData.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PhaseStageSubStageSubSpecialtyService } from "../../../../../services/phaseStageSubStageSubSpecialty.service";
import { PhaseStageSubStageSubSpecialtyDTO } from "../../../../../models/phaseStageSubStageSubSpecialty.model";
import { PhaseGetDTO } from "../../../../../models/phase.model";
import { StageGetDTO } from "../../../../../models/stage.model";
import { SubStageGetDTO } from "../../../../../models/subStage.model";
import { SubSpecialtyGetDTO } from "../../../../../models/subSpecialty.model";
import { PhaseStageSubStageSubSpecialtySendFormDataDTO } from "../../../../../models/phaseStageSubStageSubSpecialtyCreate.model"

@Component({
  selector: 'app-conf-fase-etapa-subetapa',
  imports: [CommonModule, FormsModule],
  templateUrl: './conf-fase-etapa-subetapa.html',
  styleUrl: './conf-fase-etapa-subetapa.css',
})
export class ConfFaseEtapaSubetapa {
  filtersRelations!: PhaseStageSubStageSubSpecialtyDTO[];
  loading = false;
  createModalShowFormData: PhaseStageSubStageSubSpecialtyShowFormDataDTO = {
    areas: [],
    projects: [],
    phases: [],
    stages: [],
    subStages: [],
    subSpecialties: []
  }
  createModalSendFormData: PhaseStageSubStageSubSpecialtySendFormDataDTO = {
    phaseId: 0,
    stageId: 0,
    subStageId: 0,
    subSpecialtyId: 0,
    createdUserId: 0,
    active: true
  }
  createModalSelectedPhase: PhaseGetDTO | null = null;
  createModalSelectedStage: StageGetDTO | null = null;
  createModalSelectedSubStage: SubStageGetDTO | null = null;
  createModalSelectedSubSpecialty: SubSpecialtyGetDTO | null = null;
  createModalSelectedActive: boolean = true;

  showCreateModal = false;
  /*
  createDto: PhaseCreateDTO = {
    phaseDescription: '',
    active: true
  };*/

  constructor(private phaseStageSubStageSubSpecialtyService: PhaseStageSubStageSubSpecialtyService, private lessonService: LessonService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadfiltersRelations();
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.createModalSelectedPhase = null;
    this.createModalSelectedStage = null;
    this.createModalSelectedSubStage = null;
    this.createModalSelectedSubSpecialty = null;
    this.phaseStageSubStageSubSpecialtyService.getFormData().subscribe({
      next: (data) => {
        this.createModalShowFormData = data;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  loadfiltersRelations() {
    this.loading = true;
  
    forkJoin({
      filtersRelations: this.lessonService.getFiltersCreate(),
    }).subscribe({
      next: ({ filtersRelations }) => {
        this.filtersRelations = filtersRelations;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }
  
  saveItem() {
    if (!this.createModalSelectedPhase) {
      // aquí puedes mostrar un error si la fase es obligatoria
      return;
    }

    this.createModalSendFormData = {
      phaseId: this.createModalSelectedPhase?.phaseId ?? 0,
      stageId: this.createModalSelectedStage?.stageId ?? null,
      subStageId: this.createModalSelectedSubStage?.subStageId ?? null,
      subSpecialtyId: this.createModalSelectedSubSpecialty?.subSpecialtyId ?? null,
      createdUserId: 1,
      active: this.createModalSelectedActive ?? true,
    };

    this.phaseStageSubStageSubSpecialtyService
      .createPhaseStageSubStageSubSpecialty(this.createModalSendFormData)
      .subscribe({
        next: () => {
          this.showCreateModal = false;
          this.loadfiltersRelations();
        },
        error: err => {
          console.error('Error creating item', err);
        }
      });
  }

  closeModal() {
    this.showCreateModal = false;
  }
}
