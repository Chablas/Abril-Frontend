import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkItemCategoryService } from '../../services/work-item-category.service';
import { WorkItemCategoryDto } from '../../dtos/work-item-category.dto';
import { WorkItemCategoryEditDto } from '../../dtos/work-item-category-edit.dto';
import { WorkItemCategoryClauseDto } from '../../dtos/work-item-category.dto';
import { WorkItemCategoryFilterDto } from '../../dtos/work-item-category-filter.dto';
import { WorkItemCategoryEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-item-category-list',
  standalone: true,
  imports: [CommonModule, WorkItemCategoryEdit],
  templateUrl: './list.html',
})
export class WorkItemCategoryList implements OnInit {
  @Input() filters: WorkItemCategoryFilterDto = { page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<WorkItemCategoryDto>>();

  items: WorkItemCategoryDto[] = [];
  showEditModal = false;
  editDto: WorkItemCategoryEditDto = { workItemCategoryId: 0, workItemCategoryDescription: '', active: true, clauses: [] };
  editingClauses: WorkItemCategoryClauseDto[] = [];

  constructor(
    private service: WorkItemCategoryService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.load(1));
  }

  load(page: number = 1): void {
    this.loaderService.show();
    this.service.getPaged({ ...this.filters, page }).subscribe({
      next: (res) => {
        this.items = res.data;
        this.pagedData.emit(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEdit(item: WorkItemCategoryDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      workItemCategoryId: item.workItemCategoryId,
      workItemCategoryDescription: item.workItemCategoryDescription,
      active: item.active,
      clauses: [],
    };
    this.editingClauses = item.clauses ?? [];
    this.showEditModal = true;
  }

  delete(id: number, event: MouseEvent): void {
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
      this.loaderService.show();
      this.service.delete(id).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Eliminado correctamente', confirmButtonColor: '#64BC04' });
          this.load(1);
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
