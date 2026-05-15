import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { ScopeService, ScopeTemplateDTO, ScopeItemDTO } from '../../../scope/scope.service';
import { CatalogService, CatalogItemDTO } from '../../../scope/catalog.service';
import Swal from 'sweetalert2';

interface FlatItem {
  catalogItemId: number;
  catalogItemParentId: number | null;
  description: string;
  depth: number;
  checked: boolean;
}

@Component({
  selector: 'app-psss-scope-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './psss-scope-edit.html',
  styleUrl: './psss-scope-edit.css',
})
export class PsssScopeEdit implements OnInit {
  @Input() areaId!: number;
  @Input() subAreaId?: number;
  @Input() entityName = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  areaSubareaId = 0;
  items: FlatItem[] = [];
  templates: ScopeTemplateDTO[] = [];
  searchTerm = '';
  selectedTemplateId: number | null = null;
  loading = true;

  constructor(
    private scopeService: ScopeService,
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.scopeService.getOrCreateAreaSubarea(this.areaId, this.subAreaId).subscribe({
      next: ({ areaSubareaId }) => {
        this.areaSubareaId = areaSubareaId;
        forkJoin({
          catalog: this.catalogService.getFullTree(),
          scope: this.scopeService.getScopeTree(areaSubareaId),
          templates: this.scopeService.getTemplates(),
        }).subscribe({
          next: ({ catalog, scope, templates }) => {
            const checkedIds = new Set<number>();
            this.collectScopeCatalogIds(scope, checkedIds);
            this.items = this.flattenCatalog(catalog, 0, checkedIds);
            this.templates = templates;
            this.loading = false;
            this.loaderService.hide();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private collectScopeCatalogIds(items: ScopeItemDTO[], set: Set<number>): void {
    for (const item of items) {
      set.add(item.catalogItemId);
      if (item.children?.length) this.collectScopeCatalogIds(item.children, set);
    }
  }

  private flattenCatalog(items: CatalogItemDTO[], depth: number, checkedIds: Set<number>): FlatItem[] {
    const result: FlatItem[] = [];
    for (const item of items) {
      result.push({
        catalogItemId: item.catalogItemId,
        catalogItemParentId: item.catalogItemParentId,
        description: item.catalogItemDescription,
        depth,
        checked: checkedIds.has(item.catalogItemId),
      });
      if (item.children?.length) {
        result.push(...this.flattenCatalog(item.children, depth + 1, checkedIds));
      }
    }
    return result;
  }

  get filteredItems(): FlatItem[] {
    let list = this.items;

    // Filtrar por plantilla: la plantilla contiene catalogItemIds directamente
    if (this.selectedTemplateId !== null) {
      const tpl = this.templates.find((t) => t.scopeTemplateId === this.selectedTemplateId);
      if (tpl) {
        const tplIds = new Set(tpl.catalogItemIds);
        list = list.filter((i) => tplIds.has(i.catalogItemId));
      }
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter((i) => i.description.toLowerCase().includes(term));
    return list;
  }

  get checkedCount(): number {
    return this.items.filter((i) => i.checked).length;
  }

  onCheck(item: FlatItem, checked: boolean): void {
    item.checked = checked;
    if (checked) this.checkParents(item.catalogItemParentId);
    else this.uncheckChildren(item.catalogItemId);
  }

  private checkParents(parentId: number | null): void {
    if (!parentId) return;
    const parent = this.items.find((i) => i.catalogItemId === parentId);
    if (parent && !parent.checked) {
      parent.checked = true;
      this.checkParents(parent.catalogItemParentId);
    }
  }

  private uncheckChildren(parentId: number): void {
    this.items
      .filter((i) => i.catalogItemParentId === parentId)
      .forEach((child) => {
        child.checked = false;
        this.uncheckChildren(child.catalogItemId);
      });
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.forEach((i) => (i.checked = checked));
  }

  save(): void {
    // Asegurar que padres de ítems marcados también queden marcados
    this.items.filter((i) => i.checked).forEach((i) => this.checkParents(i.catalogItemParentId));

    const nodes = this.items
      .filter((i) => i.checked)
      .map((item, idx) => ({
        catalogItemId: item.catalogItemId,
        parentCatalogItemId: item.catalogItemParentId,
        displayOrder: idx + 1,
      }));

    this.loaderService.show();
    this.scopeService.upsertScope({ areaSubareaId: this.areaSubareaId, items: nodes }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.saved.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Relaciones actualizadas', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
