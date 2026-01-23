import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ProjectService } from '../../../../../services/project.service';
import { ProjectPagedDTO } from '../../../../../models/projectPaged.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectCreateDTO } from '../../../../../models/projectCreate.model';

@Component({
  selector: 'app-proyectos',
  imports: [CommonModule, FormsModule],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css'
})
export class Proyectos implements OnInit {
  projects!: ProjectPagedDTO;
  loading = false;

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
    this.loading = true;

    forkJoin({
      projects: this.projectService.getProjectPaged(1)
    }).subscribe({
      next: ({ projects }) => {
        this.projects = projects;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }

  saveProject() {
    if (!this.createDto.projectDescription.trim()) {
      return;
    }

    this.projectService.createProject(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { projectDescription: '', active: true };
        this.loadProjects();
      },
      error: err => {
        console.error('Error creating project', err);
      }
    });
  }

  closeModal() {
    this.showCreateModal = false;
  }
}
