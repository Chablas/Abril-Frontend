import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RelationsService } from './services/relations.service';
import { RelationFiltersDTO } from './dtos/relation-filters.model';
import { RelationFlatDTO } from './dtos/relation-flat.model';
import { CreateRelationDTO } from './dtos/create-relation.model';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-relations',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './relations.html',
  styleUrl: './relations.css',
})
export class Relations implements OnInit {
  readonly estadoOptions = [
    { id: true, name: 'ACTIVO' },
    { id: false, name: 'INACTIVO' },
  ];

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
  relations: RelationFlatDTO[] = [];

  filtersData: RelationFiltersDTO = {
    phases: [],
    stages: [],
    layers: [],
    subStages: [],
    subSpecialties: [],
    partidas: [],
  };

  // Table filters
  filterPhaseId: number | null = null;
  filterStageId: number | null = null;
  filterLayerId: number | null = null;
  filterSubStageId: number | null = null;
  filterSubSpecialtyId: number | null = null;
  filterPartidaId: number | null = null;

  // Create form fields
  formPhaseId: number | null = null;
  formStageId: number | null = null;
  formLayerId: number | null = null;
  formSubStageId: number | null = null;
  formSubSpecialtyId: number | null = null;
  formPartidaId: number | null = null;
  formActive = true;

  showCreateModal = false;

  constructor(
    private relationsService: RelationsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFilters();
    this.loadRelations(1);
  }

  loadFilters(): void {
    this.relationsService.getFilters().subscribe({
      next: (data) => (this.filtersData = data),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.formPhaseId = null;
    this.formStageId = null;
    this.formLayerId = null;
    this.formSubStageId = null;
    this.formSubSpecialtyId = null;
    this.formPartidaId = null;
    this.formActive = true;
    this.showCreateModal = true;
  }

  loadRelations(page: number = 1) {
    this.loaderService.show();
    this.relationsService
      .getPaged(page, {
        phaseId: this.filterPhaseId,
        stageId: this.filterStageId,
        layerId: this.filterLayerId,
        subStageId: this.filterSubStageId,
        subSpecialtyId: this.filterSubSpecialtyId,
        partidaId: this.filterPartidaId,
      })
      .subscribe({
        next: (res) => {
          this.relations = res.data;
          this.currentPage = res.page;
          this.totalPages = res.totalPages;
          this.pageSize = res.pageSize;
          this.totalRecords = res.totalRecords;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }

  onFilterChange(): void {
    this.loadRelations(1);
  }

  saveItem() {
    if (!this.formPhaseId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione una fase.' });
      return;
    }
    const dto: CreateRelationDTO = {
      phaseId: this.formPhaseId,
      stageId: this.formStageId,
      layerId: this.formLayerId,
      subStageId: this.formSubStageId,
      subSpecialtyId: this.formSubSpecialtyId,
      partidaId: this.formPartidaId,
      active: this.formActive,
    };
    this.loaderService.show();
    this.relationsService.create(dto).subscribe({
      next: () => {
        this.loaderService.hide();
        this.showCreateModal = false;
        this.loadRelations(this.currentPage);
        Swal.fire({ title: 'Relación creada exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  deleteRelation(id: number, event: MouseEvent) {
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
        this.loaderService.show();
        this.relationsService.delete(id).subscribe({
          next: () => {
            this.loaderService.hide();
            this.loadRelations(this.currentPage);
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El registro ha sido eliminado.',
              confirmButtonColor: '#64BC04',
              icon: 'success',
            });
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      }
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.loadRelations(this.currentPage + 1);
  }
  prevPage() {
    if (this.currentPage > 1) this.loadRelations(this.currentPage - 1);
  }
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.loadRelations(page);
  }

  get pages(): number[] {
    const maxButtons = 5;
    if (this.totalPages <= maxButtons) return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    let start = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, end - maxButtons + 1);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
