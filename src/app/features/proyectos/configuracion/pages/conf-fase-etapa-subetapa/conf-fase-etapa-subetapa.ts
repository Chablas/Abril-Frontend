import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { LessonService } from "../../../../../services/lesson.service";
import { PhaseStageSubStageSubSpecialtyShowFormDataDTO } from "../../../../../models/phaseStageSubStageSubSpecialtyFormData.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PhaseStageSubStageSubSpecialtyService } from "../../../../../services/phaseStageSubStageSubSpecialty.service";
import { PhaseStageSubStageSubSpecialtyDTO } from "../../../../../models/phaseStageSubStageSubSpecialty.model";
import { PhaseStageSubStageSubSpecialtyFlatPagedDTO } from "../../../../../models/phaseStageSubStageSubSpecialtyFlatPagedDTO.model";
import { PhaseStageSubStageSubSpecialtyFlatDTO } from "../../../../../models/phaseStageSubStageSubSpecialtyFlatPagedDTO.model";
import { PhaseGetDTO } from "../../../../../models/phase.model";
import { StageGetDTO } from "../../../../../models/stage.model";
import { LayerGetDTO } from "../../../../../models/layer.model";
import { SubStageGetDTO } from "../../../../../models/subStage.model";
import { SubSpecialtyGetDTO } from "../../../../../models/subSpecialty.model";
import { PhaseStageSubStageSubSpecialtySendFormDataDTO } from "../../../../../models/phaseStageSubStageSubSpecialtyCreate.model";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-conf-fase-etapa-subetapa',
  imports: [CommonModule, FormsModule],
  templateUrl: './conf-fase-etapa-subetapa.html',
  styleUrl: './conf-fase-etapa-subetapa.css',
})
export class ConfFaseEtapaSubetapa {
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
  filtersRelations!: PhaseStageSubStageSubSpecialtyDTO[];
  relationsPaged!: PhaseStageSubStageSubSpecialtyFlatPagedDTO;
  relations: PhaseStageSubStageSubSpecialtyFlatDTO[] = [];
  loadingModal = false;
  loadingLoadPhaseStageSubStageSubSpecialties = false;
  createModalShowFormData: PhaseStageSubStageSubSpecialtyShowFormDataDTO = {
    areas: [],
    projects: [],
    phases: [],
    stages: [],
    layers: [],
    subStages: [],
    subSpecialties: []
  }
  createModalSendFormData: PhaseStageSubStageSubSpecialtySendFormDataDTO = {
    phaseId: 0,
    stageId: 0,
    layerId: 0,
    subStageId: 0,
    subSpecialtyId: 0,
    createdUserId: 0,
    active: true
  }
  createModalSelectedPhase: PhaseGetDTO | null = null;
  createModalSelectedStage: StageGetDTO | null = null;
  createModalSelectedLayer: LayerGetDTO | null = null;
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
    this.loadfiltersRelations(1);
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

  loadfiltersRelations(page: number = 1) {
    this.loadingLoadPhaseStageSubStageSubSpecialties = true;

    this.phaseStageSubStageSubSpecialtyService.getPaged(page).subscribe({
      next: res => {
        this.relationsPaged = res;
        this.relations = res.data;

        this.currentPage = res.page;
        this.totalPages = res.totalPages;
        this.pageSize = res.pageSize;
        this.totalRecords = res.totalRecords;

        this.loadingLoadPhaseStageSubStageSubSpecialties = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadingLoadPhaseStageSubStageSubSpecialties = false;
        this.cdr.detectChanges();

        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: err.error
        });
      }
    });
  }
  
  saveItem() {
    if (!this.createModalSelectedPhase) {
      // aquí puedes mostrar un error si la fase es obligatoria
      return;
    }

    this.createModalSendFormData = {
      phaseId: this.createModalSelectedPhase ?.phaseId ?? 0,
      stageId: this.createModalSelectedStage ?.stageId ?? null,
      layerId: this.createModalSelectedLayer ?.layerId ?? null,
      subStageId: this.createModalSelectedSubStage ?.subStageId ?? null,
      subSpecialtyId: this.createModalSelectedSubSpecialty ?.subSpecialtyId ?? null,
      createdUserId: 1,
      active: this.createModalSelectedActive ?? true,
    };

    this.phaseStageSubStageSubSpecialtyService
      .createPhaseStageSubStageSubSpecialty(this.createModalSendFormData)
      .subscribe({
        next: () => {
          this.showCreateModal = false;
          this.loadingModal = false;
          this.cdr.detectChanges();
          this.loadfiltersRelations();
          Swal.fire({
            title: 'Relación creada exitosamente',
            icon: 'success',
            draggable: true
          });
        },
        error: err => {
          this.loadingModal = false;
          this.cdr.detectChanges();
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: err.error,
          });
        }
      });
  }

  deletePhaseStageSubStageSubSpecialty(phaseStageSubStageSubSpecialtyId: number, event: MouseEvent) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!'
    }).then(result => {
      if (result.isConfirmed) {
        this.loadingModal = true;
        this.phaseStageSubStageSubSpecialtyService.deletePhaseStageSubStageSubSpecialty(phaseStageSubStageSubSpecialtyId, 1).subscribe({
          next: () => {
            this.loadfiltersRelations();
            this.loadingModal = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El registro ha sido eliminado.',
              confirmButtonColor: '#64BC04',
              icon: 'success'
            });
          },
          error: (error) => {
            this.loadingModal = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: 'Error',
              text: error.error,
              icon: 'error'
            });
          },
        });
      }
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadfiltersRelations(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }
  
  prevPage() {
    if (this.currentPage > 1) {
      this.loadfiltersRelations(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadfiltersRelations(page);
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

  closeModal() {
    this.showCreateModal = false;
  }
}
