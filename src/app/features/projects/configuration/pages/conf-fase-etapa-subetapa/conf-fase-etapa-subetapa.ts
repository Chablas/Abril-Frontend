import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PhaseStageSubStageSubSpecialtyShowFormDataDTO } from '../../../../../models/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialtyFormData.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhaseStageSubStageSubSpecialtyService } from '../../../../../services/phaseStageSubStageSubSpecialty.service';
import { PhaseStageSubStageSubSpecialtyDTO } from '../../../../../models/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialty.model';
import { PhaseStageSubStageSubSpecialtyFlatPagedDTO } from '../../../../../models/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialtyFlatPagedDTO.model';
import { PhaseStageSubStageSubSpecialtyFlatDTO } from '../../../../../models/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialtyFlatPagedDTO.model';
import { PhaseGetDTO } from '../../../../../models/phase/phase.model';
import { StageGetDTO } from '../../../../../models/stage/stage.model';
import { LayerGetDTO } from '../../../../../models/layer/layer.model';
import { SubStageGetDTO } from '../../../../../models/subStage/subStage.model';
import { SubSpecialtyGetDTO } from '../../../../../models/subSpecialty/subSpecialty.model';
import { PhaseStageSubStageSubSpecialtySendFormDataDTO } from '../../../../../models/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialtyCreate.model';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

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

  loader = false;

  createModalShowFormData: PhaseStageSubStageSubSpecialtyShowFormDataDTO = {
    areas: [],
    projects: [],
    phases: [],
    stages: [],
    layers: [],
    subStages: [],
    subSpecialties: [],
  };
  createModalSendFormData: PhaseStageSubStageSubSpecialtySendFormDataDTO = {
    phaseId: 0,
    stageId: 0,
    layerId: 0,
    subStageId: 0,
    subSpecialtyId: 0,
    createdUserId: 0,
    active: true,
  };
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

  constructor(
    private phaseStageSubStageSubSpecialtyService: PhaseStageSubStageSubSpecialtyService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

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

    this.loader = true;
    this.cdr.detectChanges();

    this.phaseStageSubStageSubSpecialtyService.getFormData().subscribe({
      next: (data) => {
        this.createModalShowFormData = data;
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
      this.showCreateModal = false;
      return;
    }
    if (event.target === event.currentTarget) {
      this.showCreateModal = false;
    }
  }

  loadfiltersRelations(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.phaseStageSubStageSubSpecialtyService.getPaged(page).subscribe({
      next: (res) => {
        this.relationsPaged = res;
        this.relations = res.data;

        this.currentPage = res.page;
        this.totalPages = res.totalPages;
        this.pageSize = res.pageSize;
        this.totalRecords = res.totalRecords;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
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
      layerId: this.createModalSelectedLayer?.layerId ?? null,
      subStageId: this.createModalSelectedSubStage?.subStageId ?? null,
      subSpecialtyId: this.createModalSelectedSubSpecialty?.subSpecialtyId ?? null,
      createdUserId: 1,
      active: this.createModalSelectedActive ?? true,
    };
    this.loader = true;
    this.cdr.detectChanges();
    this.phaseStageSubStageSubSpecialtyService
      .createPhaseStageSubStageSubSpecialty(this.createModalSendFormData)
      .subscribe({
        next: () => {
          this.showCreateModal = false;
          this.loader = false;
          this.cdr.detectChanges();
          this.loadfiltersRelations();
          Swal.fire({
            title: 'Relación creada exitosamente',
            icon: 'success',
            draggable: true,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
  }

  deletePhaseStageSubStageSubSpecialty(
    phaseStageSubStageSubSpecialtyId: number,
    event: MouseEvent,
  ) {
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
        this.cdr.detectChanges();
        this.phaseStageSubStageSubSpecialtyService
          .deletePhaseStageSubStageSubSpecialty(phaseStageSubStageSubSpecialtyId)
          .subscribe({
            next: () => {
              this.loader = false;
              this.cdr.detectChanges();
              this.loadfiltersRelations();
              Swal.fire({
                title: '¡Eliminado!',
                text: 'El registro ha sido eliminado.',
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

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
