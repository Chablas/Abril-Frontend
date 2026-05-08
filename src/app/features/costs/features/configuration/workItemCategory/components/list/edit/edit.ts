import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { WorkItemCategoryService } from '../../../services/work-item-category.service';
import {
  WorkItemCategoryEditDto,
  WorkItemCategoryClauseUpsertDto,
} from '../../../dtos/work-item-category-edit.dto';
import { WorkItemCategoryClauseDto } from '../../../dtos/work-item-category.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-item-category-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './edit.html',
})
export class WorkItemCategoryEdit implements OnInit {
  @Input() dto: WorkItemCategoryEditDto = {
    workItemCategoryId: 0,
    workItemCategoryDescription: '',
    active: true,
    clauses: [],
  };
  /** Cláusulas ya guardadas que vienen del item seleccionado */
  @Input() existingClauses: WorkItemCategoryClauseDto[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  /** Copia de trabajo de las cláusulas (incluye nuevas y las que ya existían) */
  clauses: WorkItemCategoryClauseUpsertDto[] = [];
  newClauseText = '';

  constructor(
    private service: WorkItemCategoryService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.clauses = this.existingClauses.map((c) => ({
      workItemCategoryClauseId: c.workItemCategoryClauseId,
      clauseText: c.clauseText,
      sortOrder: c.sortOrder,
    }));
  }

  addClause(): void {
    const text = this.newClauseText.trim();
    if (!text) return;
    this.clauses.push({
      clauseText: text,
      sortOrder: this.clauses.length,
    });
    this.newClauseText = '';
  }

  removeClause(index: number): void {
    this.clauses.splice(index, 1);
    this.recalcSortOrder();
  }

  moveUp(index: number): void {
    if (index === 0) return;
    [this.clauses[index - 1], this.clauses[index]] = [this.clauses[index], this.clauses[index - 1]];
    this.recalcSortOrder();
  }

  moveDown(index: number): void {
    if (index === this.clauses.length - 1) return;
    [this.clauses[index], this.clauses[index + 1]] = [this.clauses[index + 1], this.clauses[index]];
    this.recalcSortOrder();
  }

  private recalcSortOrder(): void {
    this.clauses.forEach((c, i) => (c.sortOrder = i));
  }

  save(): void {
    if (!this.dto.workItemCategoryDescription.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa una descripción.' });
      return;
    }

    // Agregar cláusula pendiente de texto si el usuario olvidó presionar "Agregar"
    if (this.newClauseText.trim()) {
      this.addClause();
    }

    this.dto.clauses = this.clauses;

    this.loaderService.show();
    this.service.edit(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Registro actualizado exitosamente', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
