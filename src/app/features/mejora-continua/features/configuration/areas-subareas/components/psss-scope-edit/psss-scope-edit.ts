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
  hasChildren: boolean;
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
        hasChildren: (item.children?.length ?? 0) > 0,
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

  get leafFilteredItems(): FlatItem[] {
    return this.filteredItems.filter((i) => !i.hasChildren);
  }

  get checkedCount(): number {
    return this.items.filter((i) => i.checked && !i.hasChildren).length;
  }

  get totalLeafCount(): number {
    return this.items.filter((i) => !i.hasChildren).length;
  }

  onCheck(item: FlatItem, checked: boolean): void {
    item.checked = checked;
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.filter((i) => !i.hasChildren).forEach((i) => (i.checked = checked));
  }

  save(): void {
    // Recoger hojas marcadas y calcular sus ancestros programáticamente
    const checkedLeaves = this.items.filter((i) => i.checked && !i.hasChildren);
    const idToItem = new Map(this.items.map((i) => [i.catalogItemId, i]));
    const allIds = new Set<number>();

    for (const leaf of checkedLeaves) {
      let current: FlatItem | undefined = leaf;
      while (current) {
        allIds.add(current.catalogItemId);
        current =
          current.catalogItemParentId != null
            ? idToItem.get(current.catalogItemParentId)
            : undefined;
      }
    }

    const nodes = [...allIds].map((id, idx) => {
      const item = idToItem.get(id)!;
      return {
        catalogItemId: item.catalogItemId,
        parentCatalogItemId: item.catalogItemParentId,
        displayOrder: idx + 1,
      };
    });

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
