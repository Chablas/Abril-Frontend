import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SubSpecialtyService } from '../../../../../core/services/subspecialty.service';
import { SubSpecialtyPagedDTO } from '../../../../../core/dtos/subSpecialty/subSpecialtyPaged.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SubSpecialtyCreateDTO } from '../../../../../core/dtos/subSpecialty/subSpecialtyCreate.model';
import { SubSpecialtyEditDTO } from '../../../../../core/dtos/subSpecialty/subSpecialtyEdit.model';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubSpecialtyGetDTO } from '../../../../../core/dtos/subSpecialty/subSpecialty.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';

@Component({
  selector: 'app-subespecialidades',
  imports: [CommonModule, FormsModule],
  templateUrl: './subespecialidades.html',
  styleUrl: './subespecialidades.css',
})
export class Subespecialidades implements OnInit {
  subSpecialties: SubSpecialtyPagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  createDto: SubSpecialtyCreateDTO = {
    subSpecialtyDescription: '',
    active: true,
  };
  editDto: SubSpecialtyEditDTO = {
    subSpecialtyId: 0,
    subSpecialtyDescription: '',
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
    private subSpecialtyService: SubSpecialtyService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadSubSpecialties(1);
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(subSpecialty: SubSpecialtyGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showEditModal = true;
    this.editDto.subSpecialtyId = subSpecialty.subSpecialtyId;
    this.editDto.subSpecialtyDescription = subSpecialty.subSpecialtyDescription;
    this.editDto.active = subSpecialty.active;
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

  loadSubSpecialties(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.subSpecialtyService.getSubSpecialtyPaged(page).subscribe({
      next: (response) => {
        this.subSpecialties = response;
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
      this.loadSubSpecialties(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadSubSpecialties(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadSubSpecialties(page);
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

  saveSubSpecialty() {
    if (!this.createDto.subSpecialtyDescription.trim()) {
      return;
    }
    this.loader = true;
    this.subSpecialtyService.createSubSpecialty(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { subSpecialtyDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadSubSpecialties();
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

  editSubSpecialty(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.subSpecialtyDescription.trim()) {
      return;
    }
    this.loader = true;
    this.subSpecialtyService.editSubSpecialty(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showEditModal = false;
        this.editDto = { subSpecialtyId: 0, subSpecialtyDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadSubSpecialties();
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

  deleteSubSpecialty(subSpecialtyId: number, event: MouseEvent) {
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
        this.subSpecialtyService.deleteSubSpecialty(subSpecialtyId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadSubSpecialties();
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
