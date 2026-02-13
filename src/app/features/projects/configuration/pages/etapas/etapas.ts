import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { StageService } from '../../../../../services/stage.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { StagePagedDTO } from '../../../../../models/stage/stagePaged.model';
import { StageCreateDTO } from '../../../../../models/stage/stageCreate.model';
import { StageEditDTO } from '../../../../../models/stage/stageEdit.model';
import { StageGetDTO } from '../../../../../models/stage/stage.model';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../../models/api/ApiMessage.model';

@Component({
  selector: 'app-etapas',
  imports: [CommonModule, FormsModule],
  templateUrl: './etapas.html',
  styleUrl: './etapas.css',
})
export class Etapas implements OnInit {
  stages: StagePagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  createDto: StageCreateDTO = {
    stageDescription: '',
    active: true,
  };
  editDto: StageEditDTO = {
    stageId: 0,
    stageDescription: '',
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
    private stageService: StageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadStages(1);
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(stage: StageGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showEditModal = true;
    this.editDto.stageId = stage.stageId;
    this.editDto.stageDescription = stage.stageDescription;
    this.editDto.active = stage.active;
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

  loadStages(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.stageService.getStagePaged(page).subscribe({
      next: (response) => {
        this.stages = response;
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
      this.loadStages(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadStages(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadStages(page);
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

  saveStage() {
    if (!this.createDto.stageDescription.trim()) {
      return;
    }
    this.loader = true;
    this.stageService.createStage(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { stageDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadStages();
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

  editStage(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.stageDescription.trim()) {
      return;
    }
    this.loader = true;
    this.stageService.editStage(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showEditModal = false;
        this.editDto = { stageId: 0, stageDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadStages();
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

  deleteStage(stageId: number, event: MouseEvent) {
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
        this.stageService.deleteStage(stageId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadStages();
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
