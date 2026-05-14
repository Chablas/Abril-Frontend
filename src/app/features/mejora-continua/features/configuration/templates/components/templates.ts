import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PsssTemplateService } from '../services/psss-template.service';
import {
  PsssTemplateDTO,
  PsssTemplatePagedDTO,
  PsssTemplateCreateDTO,
} from '../dtos/psss-template.model';
import { TemplateEdit } from './template-edit/template-edit';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, TemplateEdit, BaseModal],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
})
export class Templates implements OnInit {
  pagedData: PsssTemplatePagedDTO = {
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  showCreateModal = false;
  createDto: PsssTemplateCreateDTO = { templateName: '', description: '' };

  selectedTemplate: PsssTemplateDTO | null = null;
  showEditModal = false;

  constructor(
    private templateService: PsssTemplateService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadTemplates(1);
  }

  loadTemplates(page: number = 1) {
    this.loaderService.show();
    this.templateService.getTemplatesPaged(page).subscribe({
      next: (data) => {
        this.pagedData = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openCreateModal() {
    this.createDto = { templateName: '', description: '' };
    this.showCreateModal = true;
  }

  create() {
    if (!this.createDto.templateName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese un nombre para la plantilla.' });
      return;
    }
    this.loaderService.show();
    this.templateService.createTemplate(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loaderService.hide();
        this.loadTemplates(1);
        Swal.fire({ title: 'Plantilla creada exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEditModal(template: PsssTemplateDTO) {
    this.selectedTemplate = template;
    this.showEditModal = true;
  }

  delete(template: PsssTemplateDTO, event: MouseEvent) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      text: `Se eliminará la plantilla "${template.templateName}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loaderService.show();
        this.templateService.deleteTemplate(template.psssTemplateId).subscribe({
          next: () => {
            this.loaderService.hide();
            this.loadTemplates(this.pagedData.page);
            Swal.fire({ title: '¡Eliminado!', text: 'La plantilla ha sido eliminada.', confirmButtonColor: '#64BC04', icon: 'success' });
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      }
    });
  }

  // Pagination
  changePage(page: number) {
    if (page >= 1 && page <= this.pagedData.totalPages) this.loadTemplates(page);
  }

  get pages(): number[] {
    const max = 5;
    if (this.pagedData.totalPages <= max)
      return Array.from({ length: this.pagedData.totalPages }, (_, i) => i + 1);
    let start = Math.max(1, this.pagedData.page - Math.floor(max / 2));
    let end = start + max - 1;
    if (end > this.pagedData.totalPages) {
      end = this.pagedData.totalPages;
      start = Math.max(1, end - max + 1);
    }
    const result: number[] = [];
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  }
}
