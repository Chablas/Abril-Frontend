import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogService, CatalogTypeDTO, CatalogItemDTO } from '../scope/catalog.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogItemForm } from './components/catalog-item-form/catalog-item-form';
import Swal from 'sweetalert2';

interface FlatItem extends CatalogItemDTO {
  depth: number;
}

@Component({
  selector: 'app-catalog-items',
  standalone: true,
  imports: [CommonModule, CatalogItemForm],
  templateUrl: './catalog-items.html',
  styleUrl: './catalog-items.css',
})
export class CatalogItems implements OnInit {
  types: CatalogTypeDTO[] = [];
  flatItems: FlatItem[] = [];
  allItemsForType: CatalogItemDTO[] = []; // flat list for parent dropdown
  selectedTypeId: number | null = null;
  loadingTypes = true;
  loadingItems = false;

  showForm = false;
  editingItem: CatalogItemDTO | null = null;
  preselectedParentId: number | null = null;

  constructor(
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.catalogService.getTypes().subscribe({
      next: (types) => {
        this.types = types;
        this.loadingTypes = false;
        this.loaderService.hide();
        if (types.length > 0) this.selectType(types[0].catalogTypeId);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  selectType(typeId: number): void {
    this.selectedTypeId = typeId;
    this.loadingItems = true;
    this.loaderService.show();
    this.catalogService.getItemsByType(typeId).subscribe({
      next: (items) => {
        this.allItemsForType = items;
        this.flatItems = this.buildFlatTree(items, null, 0);
        this.loadingItems = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private buildFlatTree(items: CatalogItemDTO[], parentId: number | null, depth: number): FlatItem[] {
    return items
      .filter((i) => i.catalogItemParentId === parentId)
      .flatMap((i) => [
        { ...i, depth },
        ...this.buildFlatTree(items, i.catalogItemId, depth + 1),
      ]);
  }

  openCreate(parentId: number | null = null): void {
    this.editingItem = null;
    this.preselectedParentId = parentId;
    this.showForm = true;
  }

  openEdit(item: CatalogItemDTO): void {
    this.editingItem = { ...item };
    this.preselectedParentId = null;
    this.showForm = true;
  }

  delete(item: CatalogItemDTO): void {
    Swal.fire({
      title: '¿Eliminar ítem?',
      html: `<b>${item.catalogItemDescription}</b> será desactivado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.catalogService.deleteItem(item.catalogItemId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.reloadItems();
          Swal.fire({ title: 'Ítem eliminado', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  reloadItems(): void {
    if (this.selectedTypeId !== null) this.selectType(this.selectedTypeId);
  }

  onSaved(): void {
    this.showForm = false;
    this.reloadItems();
  }

  trackByTypeId(_: number, t: CatalogTypeDTO): number {
    return t.catalogTypeId;
  }

  trackByItemId(_: number, i: FlatItem): number {
    return i.catalogItemId;
  }
}
