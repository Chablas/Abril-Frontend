import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MilestoneService } from '../../../../../services/milestone.service';
import { PagedResponseDTO } from '../../../../../models/api/pagedResponse.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MilestoneCreateDTO } from '../../../../../models/milestone/milestoneCreate.model';
import { MilestoneEditDTO } from '../../../../../models/milestone/milestoneEdit.model';
import { MilestoneGetDTO } from '../../../../../models/milestone/milestone.model';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../../models/api/ApiMessage.model';

@Component({
  selector: 'app-milestones',
  imports: [CommonModule, FormsModule],
  templateUrl: './milestones.html',
  styleUrl: './milestones.css',
})
export class Milestones implements OnInit {
  milestones: PagedResponseDTO<MilestoneGetDTO> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  createDto: MilestoneCreateDTO = {
    milestoneDescription: '',
    active: true,
  };
  editDto: MilestoneEditDTO = {
    milestoneId: 0,
    milestoneDescription: '',
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
    private milestoneService: MilestoneService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadMilestones(1);
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(milestone: MilestoneGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showEditModal = true;
    this.editDto.milestoneId = milestone.milestoneId;
    this.editDto.milestoneDescription = milestone.milestoneDescription;
    this.editDto.active = milestone.active;
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

  loadMilestones(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.milestoneService.getMilestonePaged(page).subscribe({
      next: (response) => {
        this.milestones = response;
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
      this.loadMilestones(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadMilestones(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadMilestones(page);
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

  saveMilestone() {
    if (!this.createDto.milestoneDescription.trim()) {
      return;
    }
    this.loader = true;
    this.milestoneService.createMilestone(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { milestoneDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadMilestones();
        Swal.fire({
          title: response.message ?? 'Hito creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  editMilestone(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.milestoneDescription.trim()) {
      return;
    }
    this.loader = true;
    this.milestoneService.editMilestone(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showEditModal = false;
        this.editDto = { milestoneId: 0, milestoneDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadMilestones();
        Swal.fire({
          title: response.message ?? 'Hito actualizado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  deleteMilestone(milestoneId: number, event: MouseEvent) {
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
        this.milestoneService.deleteMilestone(milestoneId, 1).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadMilestones();
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
