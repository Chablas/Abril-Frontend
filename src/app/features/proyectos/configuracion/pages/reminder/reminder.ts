import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserProjectService } from '../../../../../services/userProject.service';
import { UserProjectPagedDTO } from '../../../../../models/userProject/userProjectPaged.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserProjectCreateDTO } from '../../../../../models/userProject/userProjectCreate.model';
import { UserProjectCreateDataDTO } from "../../../../../models/userProject/userProjectCreateData.model";
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from "@angular/router";
import { ApiMessageDTO } from "../../../../../models/api/ApiMessage.model";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reminder',
  imports: [CommonModule, FormsModule],
  templateUrl: './reminder.html',
  styleUrl: './reminder.css',
  standalone: true
})
export class Reminder implements OnInit {

  userProjects!: UserProjectPagedDTO;
  loadingModal = false;
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
  loadingLoadUserProjects = false;

  showCreateModal = false;
  createData: UserProjectCreateDataDTO = {
    userPersons: [],
    projects: []
  };
  createDto: UserProjectCreateDTO = {
    userId: 0,
    projectId: 0,
    active: true,
  };

  constructor(
    private userProjectService: UserProjectService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProjects();
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.loadCreateData();
    this.showCreateModal = true;
  }

  loadUserProjects(page: number = 1) {
    this.loadingLoadUserProjects = true;
    forkJoin({
      userProjects: this.userProjectService.getUserProjectPaged(page),
    }).subscribe({
      next: ({ userProjects }) => {
        this.userProjects = userProjects;
        this.currentPage = userProjects.page;
        this.totalPages = userProjects.totalPages;
        this.pageSize = userProjects.pageSize;
        this.totalRecords = userProjects.totalRecords;
        this.loadingLoadUserProjects = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        if (err.status == 401) {
          Swal.fire({
            icon: 'error',
            title: 'Sesión expirada',
            text: err.error?.message ?? 'Operación cancelada',
          });
          localStorage.clear();
          this.loadingLoadUserProjects = false;
          this.cdr.detectChanges();
          this.router.navigate(['/auth/login']);
          return;
        }
      },
    });
  }

  loadCreateData() {
    this.loadingModal = true;
    forkJoin({
      createData: this.userProjectService.getUserProjectCreateData(),
    }).subscribe({
      next: ({createData}) => {
        this.createData = createData;
        this.loadingModal = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        if (err.status == 401) {
          Swal.fire({
            icon: 'error',
            title: 'Sesión expirada',
            text: err.error?.message ?? 'Operación cancelada',
          });
          localStorage.clear();
          this.loadingModal = false;
          this.cdr.detectChanges();
          this.router.navigate(['/auth/login']);
          return;
        }
        if (err.status == 500) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message ?? 'Operación cancelada',
          });
          localStorage.clear();
          this.loadingModal = false;
          this.cdr.detectChanges();
          this.router.navigate(['/auth/login']);
          return;
        }
      }
    })
  }

  saveUserProject() {
    this.loadingModal = true;
    this.userProjectService.createUserProject(this.createDto).subscribe({
      next: (resp: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { userId: 0, projectId: 0, active: true };
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadUserProjects();
        Swal.fire({
          title: resp?.message ?? 'Operación realizada correctamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loadingModal = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message ?? 'Operación cancelada',
        });
      },
    });
  }

  deleteUserProject(userProjectId: number, event: MouseEvent) {
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
        this.loadingModal = true;
        this.userProjectService.deleteUserProject(userProjectId).subscribe({
          next: (resp: ApiMessageDTO) => {
            this.loadUserProjects();
            this.loadingModal = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: '¡Eliminado!',
              text: resp?.message ?? 'Operación realizada correctamente',
              confirmButtonColor: '#64BC04',
              icon: 'success',
            });
          },
          error: (err: HttpErrorResponse) => {
            this.loadingModal = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: 'Error',
              text: err.error?.message ?? 'Operación cancelada',
              icon: 'error',
            });
          },
        });
      }
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadUserProjects(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadUserProjects(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadUserProjects(page);
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
