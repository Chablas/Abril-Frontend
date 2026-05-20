import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { CatalogService, CatalogItemDTO } from '../../../scope/catalog.service';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

interface ParentOption {
  catalogItemId: number;
  label: string; // description with depth prefix
}

@Component({
  selector: 'app-catalog-item-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './catalog-item-form.html',
  styleUrl: './catalog-item-form.css',
})
export class CatalogItemForm implements OnInit {
  /** tipo del catálogo al que pertenece este ítem */
  @Input() catalogTypeId!: number;
  /** null → modo crear | valor → modo editar */
  @Input() editingItem: CatalogItemDTO | null = null;
  /** padre preseleccionado (cuando se pulsa "+" en una fila) */
  @Input() preselectedParentId: number | null = null;
  /** lista plana de todos los ítems del tipo para el selector de padre */
  @Input() allItems: CatalogItemDTO[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  description = '';
  code = '';
  selectedParentId: number | null = null;
  active = true;

  parentOptions: ParentOption[] = [];

  get isEdit(): boolean {
    return this.editingItem !== null;
  }

  get title(): string {
    return this.isEdit ? 'EDITAR ÍTEM' : 'NUEVO ÍTEM';
  }

  constructor(
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.buildParentOptions();

    if (this.editingItem) {
      this.description = this.editingItem.catalogItemDescription;
      this.code = this.editingItem.catalogItemCode ?? '';
      this.selectedParentId = this.editingItem.catalogItemParentId;
      this.active = this.editingItem.active;
    } else {
      this.selectedParentId = this.preselectedParentId;
    }
  }

  private buildParentOptions(): void {
    // Build flat tree sorted in tree order with depth-based prefix
    const ordered = this.buildOrderedItems(this.allItems, null, 0);
    // Exclude the item being edited (can't be its own parent)
    const editId = this.editingItem?.catalogItemId;
    this.parentOptions = ordered
      .filter((i) => i.item.catalogItemId !== editId)
      .map((i) => ({
        catalogItemId: i.item.catalogItemId,
        label: ' '.repeat(i.depth * 4) + i.item.catalogItemDescription,
      }));
  }

  private buildOrderedItems(
    items: CatalogItemDTO[],
    parentId: number | null,
    depth: number,
  ): { item: CatalogItemDTO; depth: number }[] {
    return items
      .filter((i) => i.catalogItemParentId === parentId)
      .flatMap((i) => [
        { item: i, depth },
        ...this.buildOrderedItems(items, i.catalogItemId, depth + 1),
      ]);
  }

  save(): void {
    if (!this.description.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'La descripción no puede estar vacía.' });
      return;
    }

    this.loaderService.show();

    const obs$ = this.isEdit
      ? this.catalogService.updateItem({
          catalogItemId: this.editingItem!.catalogItemId,
          catalogTypeId: this.catalogTypeId,
          catalogItemParentId: this.selectedParentId,
          catalogItemDescription: this.description.trim(),
          catalogItemCode: this.code.trim() || null,
          active: this.active,
        })
      : this.catalogService.createItem({
          catalogTypeId: this.catalogTypeId,
          catalogItemParentId: this.selectedParentId,
          catalogItemDescription: this.description.trim(),
          catalogItemCode: this.code.trim() || null,
          active: true,
        });

    obs$.subscribe({
      next: () => {
        this.loaderService.hide();
        this.saved.emit();
        Swal.fire({
          title: this.isEdit ? 'Ítem actualizado' : 'Ítem creado',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
