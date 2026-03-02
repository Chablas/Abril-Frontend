import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { IvtControlService } from "../../../../core/services/ivtControl.service";
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import { IvtControlCreateDTO } from "../../../../core/dtos/ivtControl/ivtControlCreate.model";
import { ProjectService } from '../../../../core/services/project.service';
import { CreateModalData } from "../../../../core/models/ivtControl.model";

@Component({
  selector: 'app-ivt-control',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './ivt-control.html',
  styleUrl: './ivt-control.css',
})
export class IvtControl {
  /*ivtControls: IvtControlPagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };*/

  createModalData: CreateModalData = {
    projectOptions: [],
    createDto: {
      scheduleId: 0,
      pdf: null,
    }
  }

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader = false;

  showCreateModal = false;
  showEditModal = false;

  constructor(
    private ivtControlService: IvtControlService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData() {
    //this.loader = true;
    /*forkJoin({

    }).subscribe({

    })*/
  }

  loadCreateFilters() {
    this.loader = true;
    this.projectService.getWithResidentByUserId().subscribe({
      next: (data) => {
        this.createModalData.projectOptions = data;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      }
    })
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.loadCreateFilters();
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

  /*loadIvtControls(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.ivtControlService.getIvtControlPaged(page).subscribe({
      next: (response) => {
        this.ivtControls = response;
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
  }*/

  nextPage() {
    /*if (this.currentPage < this.totalPages) {
      this.loadIvtControls(this.currentPage + 1);
      this.cdr.detectChanges();
    }*/
  }

  prevPage() {
    /*if (this.currentPage > 1) {
      this.loadIvtControls(this.currentPage - 1);
      this.cdr.detectChanges();
    }*/
  }

  goToPage(page: number) {
    /*if (page >= 1 && page <= this.totalPages) {
      this.loadIvtControls(page);
      this.cdr.detectChanges();
    }*/
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

  saveIvtControl() {
    this.loader = true;
    this.ivtControlService.createIvtControl(this.createModalData.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createModalData.createDto = { scheduleId: 0, pdf: null };
        this.loader = false;
        this.cdr.detectChanges();
        //this.loadIvtControls();
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
