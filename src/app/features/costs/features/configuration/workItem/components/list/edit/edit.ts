import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../../shared/components/search-select/search-select';
import { WorkItemService } from '../../../services/work-item.service';
import { WorkItemEditDto, WorkItemValorizationFormUpsertDto } from '../../../dtos/work-item-edit.dto';
import { WorkItemCategoryOptionDto, WorkItemValorizationFormDto } from '../../../dtos/work-item.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-item-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './edit.html',
})
export class WorkItemEdit implements OnInit {
  @Input() dto: WorkItemEditDto = { workItemId: 0, workItemDescription: '', workItemCategoryId: null, active: true, valorizationForms: [] };
  /** Formas de valorización ya guardadas para esta partida. */
  @Input() existingForms: WorkItemValorizationFormDto[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  categories: WorkItemCategoryOptionDto[] = [];

  /** Copia de trabajo de las formas de valorización (cláusula 5.1). */
  forms: WorkItemValorizationFormUpsertDto[] = [];
  newForm: { percentage: number | null; concept: string } = { percentage: null, concept: '' };

  constructor(
    private service: WorkItemService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getCategories().subscribe({
      next: (res) => {
        this.categories = res;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
    this.forms = this.existingForms.map((f) => ({
      workItemValorizationFormId: f.workItemValorizationFormId,
      concept: f.concept,
      percentage: f.percentage,
      sortOrder: f.sortOrder,
    }));
  }

  // ── Formas de valorización (cláusula 5.1) ────────────────────────────
  /** Vista previa de la oración tal como aparecerá en el contrato. */
  get formsPreview(): string {
    const partes = this.forms
      .filter((f) => f.concept.trim())
      .map((f) => `${f.percentage}% ${f.concept.trim()}`);
    if (partes.length === 0) return '';
    const listado =
      partes.length === 1 ? partes[0] : partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
    return `Las valorizaciones serán de acuerdo con los siguientes porcentajes de valorización: ${listado}.`;
  }

  get formsTotal(): number {
    return this.round2(this.forms.reduce((acc, f) => acc + (Number(f.percentage) || 0), 0));
  }

  addForm(): void {
    const concept = this.newForm.concept.trim();
    const percentage = Number(this.newForm.percentage);
    if (!concept || !percentage || percentage <= 0) return;
    const total = this.round2(this.formsTotal + percentage);
    if (total > 100) {
      this.warnOverLimit(total);
      return;
    }
    this.forms.push({ concept, percentage, sortOrder: this.forms.length });
    this.newForm = { percentage: null, concept: '' };
  }

  removeForm(index: number): void {
    this.forms.splice(index, 1);
    this.recalcSortOrder();
  }

  moveFormUp(index: number): void {
    if (index === 0) return;
    [this.forms[index - 1], this.forms[index]] = [this.forms[index], this.forms[index - 1]];
    this.recalcSortOrder();
  }

  moveFormDown(index: number): void {
    if (index === this.forms.length - 1) return;
    [this.forms[index], this.forms[index + 1]] = [this.forms[index + 1], this.forms[index]];
    this.recalcSortOrder();
  }

  private recalcSortOrder(): void {
    this.forms.forEach((f, i) => (f.sortOrder = i));
  }

  /** Suma con 2 decimales: 33.33 + 33.33 + 33.34 da 100 y no 100.00000000000001. */
  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private warnOverLimit(total: number): void {
    Swal.fire({ icon: 'warning', title: 'Supera el 100%', text: `El total quedaría en ${total}%.` });
  }

  save(): void {
    if (!this.dto.workItemDescription.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa una descripción.' });
      return;
    }
    if (!this.dto.workItemCategoryId) {
      Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Selecciona la partida de control.' });
      return;
    }
    if (this.forms.some((f) => !(Number(f.percentage) > 0))) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Cada forma de valorización debe tener un porcentaje mayor a 0.',
      });
      return;
    }

    // Agregar la fila pendiente si el usuario olvidó pulsar "Agregar". El tope se mide con ella
    // incluida: si no entrara, se guardaría sin la fila que el usuario ve escrita.
    const pending =
      this.newForm.concept.trim() && Number(this.newForm.percentage) > 0 ? Number(this.newForm.percentage) : 0;
    const total = this.round2(this.formsTotal + pending);
    if (total > 100) {
      this.warnOverLimit(total);
      return;
    }
    if (pending) this.addForm();

    const payload: WorkItemEditDto = {
      ...this.dto,
      valorizationForms: this.forms,
    };

    this.loaderService.show();
    this.service.edit(payload).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Registro actualizado exitosamente', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
