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
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { ScopeService, ScopeTemplateDTO } from '../../../scope/scope.service';
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
  selector: 'app-template-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './template-edit.html',
  styleUrl: './template-edit.css',
})
export class TemplateEdit implements OnInit, OnDestroy {
  @Input() template!: ScopeTemplateDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('treeScroll') treeScrollRef?: ElementRef<HTMLElement>;

  private scrollIntervalId: number | null = null;
  private scrollDirection = 0;
  private readonly EDGE_SIZE = 48; // px desde el borde donde se activa el auto-scroll
  private readonly SCROLL_STEP = 12; // px por tick

  editName = '';
  items: FlatCatalogItem[] = [];
  searchTerm = '';
  selectedTypeName: string | null = null;
  loading = true;

  filteredItems: FlatCatalogItem[] = [];
  visibleTree: TreeNode[] = [];
  visibleTreeRows: TreeRow[] = [];

  // Drag & drop state
  draggedItem: FlatCatalogItem | null = null;
  dropTargetId: number | null = null;
  dropGapKey: string | null = null;

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
      next: (catalog) => {
        const assignedMap = new Map(this.template.items.map((i) => [i.catalogItemId, i]));
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
        this.recomputeFiltered();
        this.recomputeTree();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
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

  selectTypeName(name: string | null): void {
    this.selectedTypeName = name;
    this.recomputeFiltered();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.recomputeFiltered();
  }

  private recomputeFiltered(): void {
    let list = this.items;
    if (this.selectedTypeName) {
      list = list.filter((i) => i.catalogTypeName === this.selectedTypeName);
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter((i) => i.description.toLowerCase().includes(term));
    this.filteredItems = list;
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.forEach((i) => this.setChecked(i, checked, false));
    this.renumberSiblings();
    this.recomputeTree();
  }

  toggleCheck(item: FlatCatalogItem, checked: boolean): void {
    this.setChecked(item, checked, true);
    this.recomputeTree();
  }

  private setChecked(item: FlatCatalogItem, checked: boolean, renumber: boolean): void {
    if (item.checked === checked) return;
    if (checked) {
      item.checked = true;
      item.parentCatalogItemId = null;
      const rootsCount = this.items.filter(
        (i) => i.checked && i !== item && i.parentCatalogItemId === null,
      ).length;
      item.displayOrder = rootsCount + 1;
    } else {
      // Reparent hijos al padre del ítem que se quita
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
    if (renumber) this.renumberSiblings();
  }

  trackByItemId(_: number, item: FlatCatalogItem): number {
    return item.catalogItemId;
  }

  // ── Árbol (der) ────────────────────────────────────────────────────────────

  trackByNode(_: number, node: TreeNode): number {
    return node.item.catalogItemId;
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
    item.displayOrder = parent.displayOrder + 0.5; // posición justo después del padre
    this.renumberSiblings();
    this.recomputeTree();
  }

  removeFromTree(item: FlatCatalogItem): void {
    this.setChecked(item, false, true);
    this.recomputeTree();
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

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
    if (this.isDescendantOf(target, dragged)) return false; // evita ciclos
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
    if (this.dropTargetId === target.catalogItemId) {
      this.dropTargetId = null;
    }
  }

  onDrop(target: FlatCatalogItem, event: DragEvent): void {
    event.preventDefault();
    const dragged = this.draggedItem;
    this.draggedItem = null;
    this.dropTargetId = null;
    if (!dragged) return;
    if (dragged.catalogItemId === target.catalogItemId) return;
    if (this.isDescendantOf(target, dragged)) return;
    if (dragged.parentCatalogItemId === target.catalogItemId) return; // ya es hijo

    dragged.parentCatalogItemId = target.catalogItemId;
    const newSiblings = this.items.filter(
      (i) =>
        i.checked && i.parentCatalogItemId === target.catalogItemId && i !== dragged,
    );
    dragged.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  onDragEnd(): void {
    this.draggedItem = null;
    this.dropTargetId = null;
    this.dropGapKey = null;
    this.stopAutoScroll();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  // ── Auto-scroll del árbol durante el drag ─────────────────────────────────

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
      if (el.scrollTop === before) this.stopAutoScroll(); // tope alcanzado
    }, 16);
  }

  private stopAutoScroll(): void {
    if (this.scrollIntervalId !== null) {
      clearInterval(this.scrollIntervalId);
      this.scrollIntervalId = null;
    }
    this.scrollDirection = 0;
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

    // Intercalar gaps entre cada nodo + uno final
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

  trackByRow(_: number, row: TreeRow): string {
    return row.kind === 'node' && row.node
      ? `n:${row.node.item.catalogItemId}`
      : `g:${row.gapKey}`;
  }

  isInDraggedSubtree(item: FlatCatalogItem): boolean {
    if (!this.draggedItem) return false;
    if (item.catalogItemId === this.draggedItem.catalogItemId) return true;
    return this.isDescendantOf(item, this.draggedItem);
  }

  canDropOnGap(row: TreeRow): boolean {
    const dragged = this.draggedItem;
    if (!dragged || row.kind !== 'gap') return false;
    // No-op: soltar justo antes de sí mismo
    if (row.gapBeforeId === dragged.catalogItemId) return false;
    // No-op: soltar justo después de sí mismo (en la misma posición exacta)
    if (row.gapParentId === dragged.parentCatalogItemId) {
      // Determinar si el gap es exactamente la posición que ya ocupa el item
      const siblings = this.items
        .filter((i) => i.checked && i.parentCatalogItemId === row.gapParentId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      const idx = siblings.indexOf(dragged);
      if (idx >= 0) {
        const nextSibling = siblings[idx + 1];
        if (
          (nextSibling && nextSibling.catalogItemId === row.gapBeforeId) ||
          (!nextSibling && row.gapBeforeId === null && row.gapParentId === null)
        ) {
          // El gap representa la posición actual del dragged → no-op
          // (solo bloqueamos cuando el gap es root-end y dragged ya es último root)
        }
      }
    }
    // Evitar ciclos: no soltar en un gap cuyo padre sea el dragged o un descendiente
    if (row.gapParentId !== null) {
      if (row.gapParentId === dragged.catalogItemId) return false;
      const newParent = this.items.find((i) => i.catalogItemId === row.gapParentId);
      if (newParent && this.isDescendantOf(newParent, dragged)) return false;
    }
    return true;
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
    if (this.dropGapKey === row.gapKey) {
      this.dropGapKey = null;
    }
  }

  onDropGap(row: TreeRow, event: DragEvent): void {
    event.preventDefault();
    if (row.kind !== 'gap') return;

    // Validar ANTES de limpiar draggedItem (canDropOnGap lee this.draggedItem)
    if (!this.canDropOnGap(row)) {
      this.draggedItem = null;
      this.dropGapKey = null;
      this.dropTargetId = null;
      return;
    }

    const dragged = this.draggedItem!;
    this.draggedItem = null;
    this.dropGapKey = null;
    this.dropTargetId = null;

    dragged.parentCatalogItemId = row.gapParentId;

    if (row.gapBeforeId !== null) {
      // Insertar justo antes del nodo "beforeId"
      const beforeNode = this.items.find((i) => i.catalogItemId === row.gapBeforeId);
      if (beforeNode) {
        dragged.displayOrder = beforeNode.displayOrder - 0.5;
      } else {
        dragged.displayOrder = this.maxSiblingOrder(row.gapParentId, dragged) + 1;
      }
    } else {
      // Gap final: append al final del nivel raíz
      dragged.displayOrder = this.maxSiblingOrder(row.gapParentId, dragged) + 1;
    }

    this.renumberSiblings();
    this.recomputeTree();
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  save(): void {
    if (!this.editName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'El nombre no puede estar vacío.' });
      return;
    }

    const items = this.items
      .filter((i) => i.checked)
      .map((item) => ({
        catalogItemId: item.catalogItemId,
        catalogItemDescription: item.description,
        parentCatalogItemId: item.parentCatalogItemId,
        displayOrder: item.displayOrder,
      }));

    this.loaderService.show();
    this.scopeService
      .updateTemplate({
        scopeTemplateId: this.template.scopeTemplateId,
        templateName: this.editName.trim(),
        items,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.saved.emit();
          this.closeModal.emit();
          Swal.fire({ title: 'Plantilla actualizada', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
