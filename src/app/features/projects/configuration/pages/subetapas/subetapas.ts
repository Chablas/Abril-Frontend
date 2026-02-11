import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SubStageService } from '../../../../../services/subStage.service';
import { SubStagePagedDTO } from '../../../../../models/subStage/subStagePaged.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SubStageCreateDTO } from '../../../../../models/subStage/subStageCreate.model';
import { FormsModule } from '@angular/forms';
import { SubStageEditDTO } from '../../../../../models/subStage/subStageEdit.model';
import { HttpErrorResponse } from '@angular/common/http';
import { SubStageGetDTO } from '../../../../../models/subStage/subStage.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../../models/api/ApiMessage.model';

@Component({
  selector: 'app-subetapas',
  imports: [CommonModule, FormsModule],
  templateUrl: './subetapas.html',
  styleUrl: './subetapas.css',
})
export class Subetapas implements OnInit {
  subStages: SubStagePagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  createDto: SubStageCreateDTO = {
    subStageDescription: '',
    active: true,
  };
  editDto: SubStageEditDTO = {
    subStageId: 0,
    subStageDescription: '',
    active: true,
  };

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader = false;

  showCreateModal = false;
  showEditModal = false;

  constructor(
    private subStageService: SubStageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadSubStages(1);
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(subStage: SubStageGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showEditModal = true;
    this.editDto.subStageId = subStage.subStageId;
    this.editDto.subStageDescription = subStage.subStageDescription;
    this.editDto.active = subStage.active;
  }

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.showCreateModal = false;
      this.showEditModal = false;
      return;
    }
    if (event.target === event.currentTarget) {
      this.showCreateModal = false;
      this.showEditModal = false;
    }
  }

  loadSubStages(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.subStageService.getSubStagePaged(page).subscribe({
      next: (response) => {
        this.subStages = response;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadSubStages(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadSubStages(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadSubStages(page);
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

  saveSubStage() {
    if (!this.createDto.subStageDescription.trim()) {
      return;
    }
    this.loader = true;
    this.subStageService.createSubStage(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { subStageDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadSubStages();
        Swal.fire({
          title: response.message ?? 'Proyecto creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  editSubStage(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.subStageDescription.trim()) {
      return;
    }
    this.loader = true;
    this.subStageService.editSubStage(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showEditModal = false;
        this.editDto = { subStageId: 0, subStageDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadSubStages();
        Swal.fire({
          title: response.message ?? 'Proyecto actualizado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  deleteSubStage(subStageId: number, event: MouseEvent) {
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
        this.subStageService.deleteSubStage(subStageId, 1).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadSubStages();
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

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();
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
