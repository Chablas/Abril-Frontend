import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { ProyectoService } from '../services/proyecto.service';
import { ProjectDto } from '../dtos/project.dto';
import { ProjectCreateDto } from '../dtos/project-create.dto';
import { ProjectEditDto } from '../dtos/project-edit.dto';
import { ContributorLookupDto } from '../dtos/company-lookup.dto';

interface ProjectFormModel {
  projectDescription: string;
  levelDescription: string;
  rucInput: string;
  contributor: ContributorLookupDto | null;
  district: string;
  location: string;
  active: boolean;
}

@Component({
  selector: 'app-proyectos-config',
  imports: [CommonModule, FormsModule],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css',
})
export class Proyectos implements OnInit {
  projects: PagedResponseDTO<ProjectDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  createForm: ProjectFormModel = this.emptyForm();
  editForm: ProjectFormModel = this.emptyForm();
  editingProjectId = 0;

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader = false;
  rucLookupLoading = false;
  showCreateModal = false;
  showEditModal = false;

  constructor(
    private proyectoService: ProyectoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load(1);
  }

  openCreateModal(event: MouseEvent): void {
    event.stopPropagation();
    this.createForm = this.emptyForm();
    this.showCreateModal = true;
  }

  openEditModal(project: ProjectDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editingProjectId = project.projectId;
    this.editForm = {
      projectDescription: project.projectDescription,
      levelDescription: project.levelDescription ?? '',
      rucInput: project.contributorRuc ?? '',
      contributor:
        project.contributorId != null && project.contributorRuc
          ? {
              contributorId: project.contributorId,
              contributorRuc: project.contributorRuc,
              contributorName: project.contributorName ?? '',
              contributorAddress: project.contributorAddress ?? '',
            }
          : null,
      district: project.district ?? '',
      location: project.location ?? '',
      active: project.active,
    };
    this.showEditModal = true;
  }

  closeModal(event: MouseEvent, force: number): void {
    if (force === 1) {
      this.showCreateModal = false;
      this.showEditModal = false;
      return;
    }
    if (event.target === event.currentTarget) {
      this.showCreateModal = false;
      this.showEditModal = false;
    }
  }

  load(page: number = 1): void {
    this.loader = true;
    this.cdr.detectChanges();

    this.proyectoService.getPaged({ page }).subscribe({
      next: (response) => {
        this.projects = response;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  lookupRuc(form: ProjectFormModel): void {
    const ruc = form.rucInput.trim();
    if (!/^\d{11}$/.test(ruc)) {
      Swal.fire({ icon: 'warning', title: 'RUC inválido', text: 'El RUC debe tener 11 dígitos.' });
      return;
    }
    this.rucLookupLoading = true;
    this.cdr.detectChanges();

    this.proyectoService.getCompanyByRuc(ruc).subscribe({
      next: (contributor) => {
        form.contributor = contributor;
        form.rucInput = contributor.contributorRuc;
        this.rucLookupLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.rucLookupLoading = false;
        this.cdr.detectChanges();
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'RUC no encontrado', text: 'No se encontró información para el RUC ingresado.' });
          return;
        }
        this.handleError(err);
      },
    });
  }

  clearContributor(form: ProjectFormModel): void {
    form.contributor = null;
    form.rucInput = '';
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.load(this.currentPage + 1);
  }

  prevPage(): void {
    if (this.currentPage > 1) this.load(this.currentPage - 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.load(page);
  }

  get pages(): number[] {
    const maxButtons = 5;
    if (this.totalPages <= maxButtons)
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);

    let start = this.currentPage - Math.floor(maxButtons / 2);
    let end = start + maxButtons - 1;

    if (start < 1) { start = 1; end = maxButtons; }
    if (end > this.totalPages) { end = this.totalPages; start = end - maxButtons + 1; }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  saveProject(): void {
    if (!this.createForm.projectDescription.trim()) return;
    this.loader = true;

    const dto: ProjectCreateDto = {
      projectDescription: this.createForm.projectDescription.trim(),
      levelDescription: this.createForm.levelDescription.trim() || undefined,
      contributorId: this.createForm.contributor?.contributorId,
      district: this.createForm.district.trim() || undefined,
      location: this.createForm.location.trim() || undefined,
      active: this.createForm.active,
    };

    this.proyectoService.create(dto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createForm = this.emptyForm();
        this.loader = false;
        this.cdr.detectChanges();
        this.load();
        Swal.fire({ title: response.message ?? 'Proyecto creado exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  editProject(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.editForm.projectDescription.trim()) return;
    this.loader = true;

    const dto: ProjectEditDto = {
      projectId: this.editingProjectId,
      projectDescription: this.editForm.projectDescription.trim(),
      levelDescription: this.editForm.levelDescription.trim() || undefined,
      contributorId: this.editForm.contributor?.contributorId,
      district: this.editForm.district.trim() || undefined,
      location: this.editForm.location.trim() || undefined,
      active: this.editForm.active,
    };

    this.proyectoService.edit(dto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showEditModal = false;
        this.editForm = this.emptyForm();
        this.editingProjectId = 0;
        this.loader = false;
        this.cdr.detectChanges();
        this.load();
        Swal.fire({ title: response.message ?? 'Proyecto actualizado exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  deleteProject(projectId: number, event: MouseEvent): void {
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
      if (!result.isConfirmed) return;
      this.loader = true;

      this.proyectoService.delete(projectId).subscribe({
        next: (response: ApiMessageDTO) => {
          this.load();
          this.loader = false;
          this.cdr.detectChanges();
          Swal.fire({
            title: '¡Eliminado!',
            text: response.message ?? 'El registro ha sido eliminado.',
            confirmButtonColor: '#64BC04',
            icon: 'success',
          });
        },
        error: (err: HttpErrorResponse) => this.handleError(err),
      });
    });
  }

  private emptyForm(): ProjectFormModel {
    return {
      projectDescription: '',
      levelDescription: '',
      rucInput: '',
      contributor: null,
      district: '',
      location: '',
      active: true,
    };
  }

  private handleError(err: HttpErrorResponse): void {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status === 401) {
      Swal.fire({ icon: 'error', title: 'Sesión expirada', text: err.error?.message ?? '' });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }
    if (err.status >= 400 && err.status < 500) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message ?? 'Ocurrió un error.' });
      return;
    }
    Swal.fire({ icon: 'error', title: 'Error del servidor', text: err.error?.message ?? 'Ocurrió un error.' });
  }
}
