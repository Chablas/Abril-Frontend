import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AreaService } from '../../../../../services/area.service';
import { AreaPagedDTO } from '../../../../../models/area/areaPaged.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AreaCreateDTO } from '../../../../../models/area/areaCreate.model';
import { AreaEditDTO } from '../../../../../models/area/areaEdit.model';
import { AreaGetDTO } from '../../../../../models/area/area.model';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../../models/api/ApiMessage.model';

@Component({
  selector: 'app-areas',
  imports: [CommonModule, FormsModule],
  templateUrl: './areas.html',
  styleUrl: './areas.css',
})
export class Areas implements OnInit {
  areas: AreaPagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  createDto: AreaCreateDTO = {
    areaDescription: '',
    active: true,
  };
  editDto: AreaEditDTO = {
    areaId: 0,
    areaDescription: '',
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
    private areaService: AreaService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadAreas(1);
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(area: AreaGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showEditModal = true;
    this.editDto.areaId = area.areaId;
    this.editDto.areaDescription = area.areaDescription;
    this.editDto.active = area.active;
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

  loadAreas(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.areaService.getAreaPaged(page).subscribe({
      next: (response) => {
        this.areas = response;
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
      this.loadAreas(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadAreas(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadAreas(page);
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

  saveArea() {
    if (!this.createDto.areaDescription.trim()) {
      return;
    }
    this.loader = true;
    this.areaService.createArea(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { areaDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadAreas();
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

  editArea(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.areaDescription.trim()) {
      return;
    }
    this.loader = true;
    this.areaService.editArea(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showEditModal = false;
        this.editDto = { areaId: 0, areaDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadAreas();
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

  deleteArea(areaId: number, event: MouseEvent) {
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
        this.areaService.deleteArea(areaId, 1).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadAreas();
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
