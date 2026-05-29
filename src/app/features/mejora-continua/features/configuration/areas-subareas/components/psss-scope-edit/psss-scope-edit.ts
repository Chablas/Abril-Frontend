import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import {
  ScopeService,
  ScopeTemplateDTO,
  ScopeTemplateItemNodeDTO,
  ScopeItemDTO,
} from '../../../scope/scope.service';
import { CatalogService } from '../../../scope/catalog.service';
import Swal from 'sweetalert2';

interface FlatCatalogItem {
  catalogItemId: number;
  catalogTypeName: string;
  description: string;
  checked: boolean;
  parentCatalogItemId: number | null;
  displayOrder: number;
}

interface TreeNode {
  item: FlatCatalogItem;
  depth: number;
  canUp: boolean;
  canDown: boolean;
  canIndent: boolean;
  canOutdent: boolean;
}

interface TreeRow {
  kind: 'node' | 'gap';
  node: TreeNode | null;
  gapParentId: number | null;
  gapBeforeId: number | null;
  gapDepth: number;
  gapKey: string;
}

@Component({
  selector: 'app-psss-scope-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './psss-scope-edit.html',
  styleUrl: './psss-scope-edit.css',
})
export class PsssScopeEdit implements OnInit, OnDestroy {
  @Input() lessonAreaId!: number;
  @Input() entityName = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('treeScroll') treeScrollRef?: ElementRef<HTMLElement>;

  items: FlatCatalogItem[] = [];
  templates: ScopeTemplateDTO[] = [];
  searchTerm = '';
  selectedTemplateId: number | null = null;
  loading = true;

  filteredItems: FlatCatalogItem[] = [];
  visibleTree: TreeNode[] = [];
  visibleTreeRows: TreeRow[] = [];

  draggedItem: FlatCatalogItem | null = null;
  dropTargetId: number | null = null;
  dropGapKey: string | null = null;

  private scrollIntervalId: number | null = null;
  private scrollDirection = 0;
  private readonly EDGE_SIZE = 48;
  private readonly SCROLL_STEP = 12;

  constructor(
    private scopeService: ScopeService,
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    forkJoin({
      catalog: this.catalogService.getFullTree(),
      scope: this.scopeService.getScopeTree(this.lessonAreaId),
      templates: this.scopeService.getTemplates(),
    }).subscribe({
      next: ({ catalog, scope, templates }) => {
        const assignedMap = this.flattenScope(scope);
        this.items = catalog.map((item) => {
          const assigned = assignedMap.get(item.catalogItemId);
          return {
            catalogItemId: item.catalogItemId,
            catalogTypeName: item.catalogTypeName,
            description: item.catalogItemDescription,
            checked: !!assigned,
            parentCatalogItemId: assigned?.parentCatalogItemId ?? null,
            displayOrder: assigned?.displayOrder ?? 0,
          };
        });
        this.templates = templates;
        this.recomputeFiltered();
        this.recomputeTree();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private flattenScope(
    items: ScopeItemDTO[],
  ): Map<number, { parentCatalogItemId: number | null; displayOrder: number }> {
    const result = new Map<
      number,
      { parentCatalogItemId: number | null; displayOrder: number }
    >();
    const idToCatalog = new Map<number, number>(); // scopeItemId → catalogItemId
    const collectIds = (list: ScopeItemDTO[]) => {
      for (const item of list) {
        idToCatalog.set(item.scopeItemId, item.catalogItemId);
        if (item.children?.length) collectIds(item.children);
      }
    };
    collectIds(items);

    const walk = (list: ScopeItemDTO[]) => {
      for (const item of list) {
        const parentCatalogItemId = item.scopeItemParentId
          ? idToCatalog.get(item.scopeItemParentId) ?? null
          : null;
        result.set(item.catalogItemId, {
          parentCatalogItemId,
          displayOrder: item.displayOrder,
        });
        if (item.children?.length) walk(item.children);
      }
    };
    walk(items);
    return result;
  }

  // ── Catálogo (izq) ─────────────────────────────────────────────────────────

  get typeNames(): string[] {
    return [...new Set(this.items.map((i) => i.catalogTypeName))].sort();
  }

  get checkedCount(): number {
    return this.items.filter((i) => i.checked).length;
  }

  get totalCount(): number {
    return this.items.length;
  }

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
  }

  toggleAll(checked: boolean): void {
    if (checked) {
      for (const i of this.filteredItems) {
        if (!i.checked) this.checkWithAncestors(i);
      }
    } else {
      this.filteredItems.forEach((i) => this.uncheckItem(i));
    }
    this.renumberSiblings();
    this.recomputeTree();
  }

  toggleCheck(item: FlatCatalogItem, checked: boolean): void {
    if (checked) {
      this.checkWithAncestors(item);
    } else {
      this.uncheckItem(item);
    }
    this.renumberSiblings();
    this.recomputeTree();
  }

  /**
   * Marca el ítem y, si tiene plantilla de origen, también marca sus ancestros
   * posicionándolos según la jerarquía de la plantilla. Los ítems ya marcados
   * no se reposicionan (se respeta lo que el usuario ya ordenó).
   */
  private checkWithAncestors(item: FlatCatalogItem): void {
    if (item.checked) return;

    const tpl = this.findTemplateFor(item.catalogItemId);

    // Sin plantilla con jerarquía → comportamiento original: agregar como raíz
    if (!tpl) {
      item.checked = true;
      item.parentCatalogItemId = null;
      item.displayOrder = this.items.filter(
        (i) => i.checked && i !== item && i.parentCatalogItemId === null,
      ).length + 1;
      return;
    }

    // Construir cadena raíz→hoja del ítem dentro de la plantilla.
    // Un mismo catalog_item puede aparecer varias veces bajo padres distintos;
    // si así fuese, se elige el primero (suficiente para el auto-arrange).
    const tplByNodeId = new Map<number, ScopeTemplateItemNodeDTO>();
    const firstNodeByCat = new Map<number, ScopeTemplateItemNodeDTO>();
    tpl.items.forEach((ti) => {
      tplByNodeId.set(ti.nodeId, ti);
      if (!firstNodeByCat.has(ti.catalogItemId)) firstNodeByCat.set(ti.catalogItemId, ti);
    });

    const startNode = firstNodeByCat.get(item.catalogItemId);
    if (!startNode) return;

    const chain: number[] = [];
    let cursorNodeId: number | null = startNode.nodeId;
    let safety = 50;
    while (cursorNodeId !== null && safety-- > 0) {
      const node = tplByNodeId.get(cursorNodeId);
      if (!node) break;
      chain.push(node.catalogItemId);
      cursorNodeId = node.parentNodeId;
    }
    chain.reverse(); // raíz primero

    // Marcar lo que falte siguiendo la cadena
    let prevCatId: number | null = null;
    for (const catId of chain) {
      const flat = this.items.find((i) => i.catalogItemId === catId);
      if (!flat) {
        prevCatId = catId;
        continue;
      }
      if (!flat.checked) {
        flat.checked = true;
        flat.parentCatalogItemId = prevCatId;
        flat.displayOrder = this.items.filter(
          (i) => i.checked && i !== flat && i.parentCatalogItemId === prevCatId,
        ).length + 1;
      }
      prevCatId = catId;
    }
  }

  /** Plantilla a usar como fuente de jerarquía: la seleccionada como filtro, o la primera que contenga el ítem. */
  private findTemplateFor(catalogItemId: number): ScopeTemplateDTO | null {
    if (this.selectedTemplateId !== null) {
      const tpl = this.templates.find((t) => t.scopeTemplateId === this.selectedTemplateId);
      if (tpl && tpl.items.some((i) => i.catalogItemId === catalogItemId)) return tpl;
    }
    for (const t of this.templates) {
      if (t.items.some((i) => i.catalogItemId === catalogItemId)) return t;
    }
    return null;
  }

  private uncheckItem(item: FlatCatalogItem): void {
    if (!item.checked) return;
    // Reparenta hijos al padre del ítem que se quita
    const newParentId = item.parentCatalogItemId;
    for (const child of this.items) {
      if (child.checked && child.parentCatalogItemId === item.catalogItemId) {
        child.parentCatalogItemId = newParentId;
      }
    }
    item.checked = false;
    item.parentCatalogItemId = null;
    item.displayOrder = 0;
  }

  trackByItemId(_: number, item: FlatCatalogItem): number {
    return item.catalogItemId;
  }

  // ── Árbol (der) ────────────────────────────────────────────────────────────

  trackByNode(_: number, node: TreeNode): number {
    return node.item.catalogItemId;
  }

  trackByRow(_: number, row: TreeRow): string {
    return row.kind === 'node' && row.node
      ? `n:${row.node.item.catalogItemId}`
      : `g:${row.gapKey}`;
  }

  private getSiblings(item: FlatCatalogItem): FlatCatalogItem[] {
    return this.items
      .filter((i) => i.checked && i.parentCatalogItemId === item.parentCatalogItemId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  moveUp(item: FlatCatalogItem): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    [item.displayOrder, prev.displayOrder] = [prev.displayOrder, item.displayOrder];
    this.recomputeTree();
  }

  moveDown(item: FlatCatalogItem): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx === -1 || idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    [item.displayOrder, next.displayOrder] = [next.displayOrder, item.displayOrder];
    this.recomputeTree();
  }

  indent(item: FlatCatalogItem): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx <= 0) return;
    const newParent = siblings[idx - 1];
    item.parentCatalogItemId = newParent.catalogItemId;
    const newSiblings = this.items.filter(
      (i) => i.checked && i.parentCatalogItemId === newParent.catalogItemId && i !== item,
    );
    item.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  outdent(item: FlatCatalogItem): void {
    if (item.parentCatalogItemId === null) return;
    const parent = this.items.find((i) => i.catalogItemId === item.parentCatalogItemId);
    if (!parent) return;
    item.parentCatalogItemId = parent.parentCatalogItemId;
    item.displayOrder = parent.displayOrder + 0.5;
    this.renumberSiblings();
    this.recomputeTree();
  }

  removeFromTree(item: FlatCatalogItem): void {
    this.uncheckItem(item);
    this.renumberSiblings();
    this.recomputeTree();
  }

  private maxSiblingOrder(parentId: number | null, exclude: FlatCatalogItem): number {
    let max = 0;
    for (const i of this.items) {
      if (!i.checked) continue;
      if (i === exclude) continue;
      if (i.parentCatalogItemId !== parentId) continue;
      if (i.displayOrder > max) max = i.displayOrder;
    }
    return max;
  }

  private renumberSiblings(): void {
    const groups = new Map<number | null, FlatCatalogItem[]>();
    for (const item of this.items) {
      if (!item.checked) continue;
      const key = item.parentCatalogItemId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    for (const [, siblings] of groups) {
      siblings.sort((a, b) => a.displayOrder - b.displayOrder);
      siblings.forEach((s, idx) => (s.displayOrder = idx + 1));
    }
  }

  private recomputeTree(): void {
    const result: TreeNode[] = [];
    const walk = (parentId: number | null, depth: number) => {
      const siblings = this.items
        .filter((i) => i.checked && i.parentCatalogItemId === parentId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      siblings.forEach((sib, idx) => {
        result.push({
          item: sib,
          depth,
          canUp: idx > 0,
          canDown: idx < siblings.length - 1,
          canIndent: idx > 0,
          canOutdent: parentId !== null,
        });
        walk(sib.catalogItemId, depth + 1);
      });
    };
    walk(null, 0);
    this.visibleTree = result;

    const rows: TreeRow[] = [];
    for (const node of result) {
      const gapKey = `${node.item.parentCatalogItemId ?? 'r'}:${node.item.catalogItemId}`;
      rows.push({
        kind: 'gap',
        node: null,
        gapParentId: node.item.parentCatalogItemId,
        gapBeforeId: node.item.catalogItemId,
        gapDepth: node.depth,
        gapKey,
      });
      rows.push({
        kind: 'node',
        node,
        gapParentId: null,
        gapBeforeId: null,
        gapDepth: 0,
        gapKey: '',
      });
    }
    rows.push({
      kind: 'gap',
      node: null,
      gapParentId: null,
      gapBeforeId: null,
      gapDepth: 0,
      gapKey: 'r:end',
    });
    this.visibleTreeRows = rows;
  }

  isInDraggedSubtree(item: FlatCatalogItem): boolean {
    if (!this.draggedItem) return false;
    if (item.catalogItemId === this.draggedItem.catalogItemId) return true;
    return this.isDescendantOf(item, this.draggedItem);
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  private isDescendantOf(item: FlatCatalogItem, ancestor: FlatCatalogItem): boolean {
    let currentParentId: number | null = item.parentCatalogItemId;
    let safety = 200;
    while (currentParentId !== null && safety-- > 0) {
      if (currentParentId === ancestor.catalogItemId) return true;
      const parent = this.items.find((i) => i.catalogItemId === currentParentId);
      currentParentId = parent?.parentCatalogItemId ?? null;
    }
    return false;
  }

  canDropOn(target: FlatCatalogItem): boolean {
    const dragged = this.draggedItem;
    if (!dragged) return false;
    if (dragged.catalogItemId === target.catalogItemId) return false;
    if (this.isDescendantOf(target, dragged)) return false;
    return true;
  }

  canDropOnGap(row: TreeRow): boolean {
    const dragged = this.draggedItem;
    if (!dragged || row.kind !== 'gap') return false;
    if (row.gapBeforeId === dragged.catalogItemId) return false;
    if (row.gapParentId !== null) {
      if (row.gapParentId === dragged.catalogItemId) return false;
      const newParent = this.items.find((i) => i.catalogItemId === row.gapParentId);
      if (newParent && this.isDescendantOf(newParent, dragged)) return false;
    }
    return true;
  }

  onDragStart(item: FlatCatalogItem, event: DragEvent): void {
    this.draggedItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.catalogItemId));
    }
  }

  onDragOver(target: FlatCatalogItem, event: DragEvent): void {
    if (!this.canDropOn(target)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dropTargetId !== target.catalogItemId) {
      this.dropTargetId = target.catalogItemId;
      this.dropGapKey = null;
    }
  }

  onDragLeave(target: FlatCatalogItem): void {
    if (this.dropTargetId === target.catalogItemId) this.dropTargetId = null;
  }

  onDrop(target: FlatCatalogItem, event: DragEvent): void {
    event.preventDefault();
    const dragged = this.draggedItem;
    this.draggedItem = null;
    this.dropTargetId = null;
    this.dropGapKey = null;
    this.stopAutoScroll();
    if (!dragged) return;
    if (dragged.catalogItemId === target.catalogItemId) return;
    if (this.isDescendantOf(target, dragged)) return;
    if (dragged.parentCatalogItemId === target.catalogItemId) return;

    dragged.parentCatalogItemId = target.catalogItemId;
    const newSiblings = this.items.filter(
      (i) => i.checked && i.parentCatalogItemId === target.catalogItemId && i !== dragged,
    );
    dragged.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  onDragOverGap(row: TreeRow, event: DragEvent): void {
    if (!this.canDropOnGap(row)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dropGapKey !== row.gapKey) {
      this.dropGapKey = row.gapKey;
      this.dropTargetId = null;
    }
  }

  onDragLeaveGap(row: TreeRow): void {
    if (this.dropGapKey === row.gapKey) this.dropGapKey = null;
  }

  onDropGap(row: TreeRow, event: DragEvent): void {
    event.preventDefault();
    if (row.kind !== 'gap') return;
    if (!this.canDropOnGap(row)) {
      this.draggedItem = null;
      this.dropGapKey = null;
      this.dropTargetId = null;
      this.stopAutoScroll();
      return;
    }

    const dragged = this.draggedItem!;
    this.draggedItem = null;
    this.dropGapKey = null;
    this.dropTargetId = null;
    this.stopAutoScroll();

    dragged.parentCatalogItemId = row.gapParentId;

    if (row.gapBeforeId !== null) {
      const beforeNode = this.items.find((i) => i.catalogItemId === row.gapBeforeId);
      if (beforeNode) {
        dragged.displayOrder = beforeNode.displayOrder - 0.5;
      } else {
        dragged.displayOrder = this.maxSiblingOrder(row.gapParentId, dragged) + 1;
      }
    } else {
      dragged.displayOrder = this.maxSiblingOrder(row.gapParentId, dragged) + 1;
    }

    this.renumberSiblings();
    this.recomputeTree();
  }

  onDragEnd(): void {
    this.draggedItem = null;
    this.dropTargetId = null;
    this.dropGapKey = null;
    this.stopAutoScroll();
  }

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  onTreeContainerDragOver(event: DragEvent): void {
    if (!this.draggedItem) return;
    const el = this.treeScrollRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = event.clientY;
    let direction = 0;
    if (y < rect.top + this.EDGE_SIZE) direction = -1;
    else if (y > rect.bottom - this.EDGE_SIZE) direction = 1;

    if (direction !== this.scrollDirection) {
      this.scrollDirection = direction;
      if (direction === 0) this.stopAutoScroll();
      else this.startAutoScroll();
    }
  }

  private startAutoScroll(): void {
    if (this.scrollIntervalId !== null) return;
    this.scrollIntervalId = window.setInterval(() => {
      const el = this.treeScrollRef?.nativeElement;
      if (!el || this.scrollDirection === 0 || !this.draggedItem) {
        this.stopAutoScroll();
        return;
      }
      const before = el.scrollTop;
      el.scrollTop = before + this.scrollDirection * this.SCROLL_STEP;
      if (el.scrollTop === before) this.stopAutoScroll();
    }, 16);
  }

  private stopAutoScroll(): void {
    if (this.scrollIntervalId !== null) {
      clearInterval(this.scrollIntervalId);
      this.scrollIntervalId = null;
    }
    this.scrollDirection = 0;
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  save(): void {
    const items = this.items
      .filter((i) => i.checked)
      .map((item) => ({
        catalogItemId: item.catalogItemId,
        parentCatalogItemId: item.parentCatalogItemId,
        displayOrder: item.displayOrder,
      }));

    this.loaderService.show();
    this.scopeService.upsertScope({ lessonAreaId: this.lessonAreaId, items }).subscribe({
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
