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
  loadingLoadProjects = false;

  showCreateModal = false;
  createDto: ProjectCreateDTO = {
    projectDescription: '',
    active: true
  };

  constructor(private projectService: ProjectService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  loadProjects() {
    this.loadingLoadProjects = true;
    forkJoin({
      projects: this.projectService.getProjectPaged(1)
    }).subscribe({
      next: ({ projects }) => {
        this.projects = projects;
        this.loadingLoadProjects = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadingLoadProjects = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
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
