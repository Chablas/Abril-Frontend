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
  catalogTypeName: string;
  description: string;
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

  // Cached derived arrays
  filteredItems: FlatItem[] = [];
  leafFilteredItems: FlatItem[] = [];
  visibleItems: FlatItem[] = [];

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
            const checkedIds = this.collectScopeCatalogIds(scope);
            this.items = catalog.map((item) => ({
              catalogItemId: item.catalogItemId,
              catalogTypeName: item.catalogTypeName,
              description: item.catalogItemDescription,
              checked: checkedIds.has(item.catalogItemId),
            }));
            this.sortItemsByScope(scope);
            this.templates = templates;
            this.recomputeFiltered();
            this.loading = false;
            this.loaderService.hide();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private collectScopeCatalogIds(items: ScopeItemDTO[]): Set<number> {
    const set = new Set<number>();
    const visit = (list: ScopeItemDTO[]) => {
      for (const item of list) {
        set.add(item.catalogItemId);
        if (item.children?.length) visit(item.children);
      }
    };
    visit(items);
    return set;
  }

  private sortItemsByScope(scopeItems: ScopeItemDTO[]): void {
    if (!scopeItems.length) return;
    const orderMap = new Map<number, number>();
    const collect = (items: ScopeItemDTO[]) => {
      items.forEach((item, i) => {
        orderMap.set(item.catalogItemId, i);
        if (item.children?.length) collect(item.children);
      });
    };
    collect(scopeItems);
    this.items.sort((a, b) => {
      const oa = orderMap.get(a.catalogItemId);
      const ob = orderMap.get(b.catalogItemId);
      if (oa !== undefined && ob !== undefined) return oa - ob;
      if (oa !== undefined) return -1;
      if (ob !== undefined) return 1;
      return 0;
    });
  }

  // ── Filters ─────────────────────────────────────────────────────────────────

  selectTemplate(id: number | null): void {
    this.selectedTemplateId = id;
    this.recomputeFiltered();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.recomputeFiltered();
  }

  private recomputeFiltered(): void {
    let list = this.items;

    if (this.selectedTemplateId !== null) {
      const tpl = this.templates.find((t) => t.scopeTemplateId === this.selectedTemplateId);
      if (tpl) {
        const tplIds = new Set(tpl.items.map((i) => i.catalogItemId));
        list = list.filter((i) => tplIds.has(i.catalogItemId));
      }
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter((i) => i.description.toLowerCase().includes(term));

    this.filteredItems = list;
    this.leafFilteredItems = list;
    this.visibleItems = list;
  }

  trackByItemId(_: number, item: FlatItem): number {
    return item.catalogItemId;
  }

  // ── Reorder ─────────────────────────────────────────────────────────────────

  canMoveUp(index: number): boolean {
    return index > 0;
  }

  canMoveDown(index: number): boolean {
    return index < this.visibleItems.length - 1;
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    const aId = this.visibleItems[index - 1].catalogItemId;
    const bId = this.visibleItems[index].catalogItemId;
    this.swapInItems(aId, bId);
  }

  moveDown(index: number): void {
    if (index >= this.visibleItems.length - 1) return;
    const aId = this.visibleItems[index].catalogItemId;
    const bId = this.visibleItems[index + 1].catalogItemId;
    this.swapInItems(aId, bId);
  }

  private swapInItems(aId: number, bId: number): void {
    const aIdx = this.items.findIndex((i) => i.catalogItemId === aId);
    const bIdx = this.items.findIndex((i) => i.catalogItemId === bId);
    if (aIdx < 0 || bIdx < 0) return;
    [this.items[aIdx], this.items[bIdx]] = [this.items[bIdx], this.items[aIdx]];
    this.recomputeFiltered();
  }

  // ── Counters ─────────────────────────────────────────────────────────────────

  get checkedCount(): number {
    return this.items.filter((i) => i.checked).length;
  }

  get totalLeafCount(): number {
    return this.items.length;
  }

  toggleAll(checked: boolean): void {
    this.leafFilteredItems.forEach((i) => (i.checked = checked));
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  save(): void {
    const checkedItems = this.items.filter((i) => i.checked);
    const nodes = checkedItems.map((item, idx) => ({
      catalogItemId: item.catalogItemId,
      parentCatalogItemId: null,
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
