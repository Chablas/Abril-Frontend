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
  hasChildren: boolean;
  checked: boolean;
  rootCategoryId: number;
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
  selectedRootId: number | null = null;
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
    rootId?: number,
  ): FlatCatalogItem[] {
    const result: FlatCatalogItem[] = [];
    for (const item of items) {
      const effectiveRootId = depth === 0 ? item.catalogItemId : rootId!;
      result.push({
        catalogItemId: item.catalogItemId,
        catalogItemParentId: item.catalogItemParentId,
        description: item.catalogItemDescription,
        depth,
        hasChildren: (item.children?.length ?? 0) > 0,
        checked: assigned.has(item.catalogItemId),
        rootCategoryId: effectiveRootId,
      });
      if (item.children?.length) {
        result.push(...this.flattenCatalog(item.children, depth + 1, assigned, effectiveRootId));
      }
    }
    return result;
  }

  get rootCategories(): { id: number; description: string }[] {
    const seen = new Set<number>();
    const result: { id: number; description: string }[] = [];
    for (const item of this.items) {
      if (item.depth === 0 && !seen.has(item.catalogItemId)) {
        seen.add(item.catalogItemId);
        result.push({ id: item.catalogItemId, description: item.description });
      }
    }
    return result;
  }

  get filteredItems(): FlatCatalogItem[] {
    let list = this.items;
    if (this.selectedRootId !== null) {
      list = list.filter((i) => i.rootCategoryId === this.selectedRootId);
    }
    const term = this.searchTerm.trim().toLowerCase();
    return term ? list.filter((i) => i.description.toLowerCase().includes(term)) : list;
  }

  get leafFilteredItems(): FlatCatalogItem[] {
    return this.filteredItems.filter((i) => !i.hasChildren);
  }

  get checkedCount(): number {
    return this.items.filter((i) => i.checked && !i.hasChildren).length;
  }

  get totalLeafCount(): number {
    return this.items.filter((i) => !i.hasChildren).length;
  }

  trackByCatId(_: number, cat: { id: number; description: string }): number {
    return cat.id;
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.filter((i) => !i.hasChildren).forEach((i) => (i.checked = checked));
  }

  save(): void {
    if (!this.editName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'El nombre no puede estar vacío.' });
      return;
    }
    const catalogItemIds = this.items.filter((i) => i.checked && !i.hasChildren).map((i) => i.catalogItemId);
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
