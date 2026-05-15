import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { ScopeService, ScopeTemplateDTO } from '../../../scope/scope.service';
import { CatalogService, CatalogItemDTO } from '../../../scope/catalog.service';
import Swal from 'sweetalert2';

interface FlatCatalogItem {
  catalogItemId: number;
  catalogItemParentId: number | null;
  description: string;
  depth: number;
  checked: boolean;
}

@Component({
  selector: 'app-template-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './template-edit.html',
  styleUrl: './template-edit.css',
})
export class TemplateEdit implements OnInit {
  @Input() template!: ScopeTemplateDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  editName = '';
  items: FlatCatalogItem[] = [];
  searchTerm = '';
  loading = true;

  constructor(
    private scopeService: ScopeService,
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.editName = this.template.templateName;
    this.loaderService.show();
    this.catalogService.getFullTree().subscribe({
      next: (tree) => {
        const assigned = new Set(this.template.catalogItemIds);
        this.items = this.flattenCatalog(tree, 0, assigned);
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private flattenCatalog(
    items: CatalogItemDTO[],
    depth: number,
    assigned: Set<number>,
  ): FlatCatalogItem[] {
    const result: FlatCatalogItem[] = [];
    for (const item of items) {
      result.push({
        catalogItemId: item.catalogItemId,
        catalogItemParentId: item.catalogItemParentId,
        description: item.catalogItemDescription,
        depth,
        checked: assigned.has(item.catalogItemId),
      });
      if (item.children?.length) {
        result.push(...this.flattenCatalog(item.children, depth + 1, assigned));
      }
    }
    return result;
  }

  get filteredItems(): FlatCatalogItem[] {
    const term = this.searchTerm.trim().toLowerCase();
    return term ? this.items.filter((i) => i.description.toLowerCase().includes(term)) : this.items;
  }

  get checkedCount(): number {
    return this.items.filter((i) => i.checked).length;
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.forEach((i) => (i.checked = checked));
  }

  save(): void {
    if (!this.editName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'El nombre no puede estar vacío.' });
      return;
    }
    const catalogItemIds = this.items.filter((i) => i.checked).map((i) => i.catalogItemId);
    this.loaderService.show();
    this.scopeService
      .updateTemplate({
        scopeTemplateId: this.template.scopeTemplateId,
        templateName: this.editName.trim(),
        catalogItemIds,
      })
      .subscribe({
        next: () => {
          this.saved.emit();
          this.closeModal.emit();
          Swal.fire({ title: 'Plantilla actualizada', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
