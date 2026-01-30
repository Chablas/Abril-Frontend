import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ProjectService } from '../../../../../services/project.service';
import { ProjectPagedDTO } from '../../../../../models/projectPaged.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectCreateDTO } from '../../../../../models/projectCreate.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-proyectos',
  imports: [CommonModule, FormsModule],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css'
})
export class Proyectos implements OnInit {
  projects!: ProjectPagedDTO;
  loadingModal = false;
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
  loadingLoadProjects = false;

  showCreateModal = false;
  createDto: ProjectCreateDTO = {
    projectDescription: '',
    active: true
  };

  constructor(private projectService: ProjectService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadProjects(1);
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  loadProjects(page: number = 1) {
    this.loadingLoadProjects = true;
  
    this.projectService.getProjectPaged(page).subscribe({
      next: (response) => {
        this.projects = response;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;
  
        this.loadingLoadProjects = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadingLoadProjects = false;
        this.cdr.detectChanges();
  
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: err.error ?? 'Error al cargar proyectos'
        });
      }
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadProjects(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }
  
  prevPage() {
    if (this.currentPage > 1) {
      this.loadProjects(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadProjects(page);
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

  saveProject() {
    if (!this.createDto.projectDescription.trim()) {
      return;
    }
    this.loadingModal = true;
    this.projectService.createProject(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { projectDescription: '', active: true };
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadProjects();
        Swal.fire({
          title: 'Proyecto creado exitosamente',
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

  deleteProject(projectId: number, event: MouseEvent) {
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
        this.projectService.deleteProject(projectId, 1).subscribe({
          next: () => {
            this.loadProjects();
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

  closeModal() {
    this.showCreateModal = false;
  }
}
