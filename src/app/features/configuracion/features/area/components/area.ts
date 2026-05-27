import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { AreaTypeDto } from '../dtos/areaType.model';
import { AreaItemDto } from '../dtos/areaItem.model';
import { AreaTypeList } from './area-type/area-type-list';
import { AreaTypeCreate } from './area-type/area-type-create';
import { AreaItemList } from './area-item/area-item-list';
import { AreaItemCreate } from './area-item/area-item-create';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [CommonModule, Paginator, AreaTypeList, AreaTypeCreate, AreaItemList, AreaItemCreate],
  templateUrl: './area.html',
  styleUrl: './area.css',
})
export class Area {
  @ViewChild(AreaTypeList) typeList!: AreaTypeList;
  @ViewChild(AreaItemList) itemList!: AreaItemList;

  // Pagination state — tipos
  typePage = 1;
  typeTotalPages = 0;
  typeTotalRecords = 0;

  // Pagination state — items
  itemPage = 1;
  itemTotalPages = 0;
  itemTotalRecords = 0;

  showCreateTypeModal = false;
  showCreateItemModal = false;

  constructor(private cdr: ChangeDetectorRef) {}

  openCreateType(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateTypeModal = true;
    this.cdr.detectChanges();
  }

  openCreateItem(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateItemModal = true;
    this.cdr.detectChanges();
  }

  onTypePaged(data: PagedResponseDTO<AreaTypeDto>) {
    this.typePage = data.page;
    this.typeTotalPages = data.totalPages;
    this.typeTotalRecords = data.totalRecords;
  }

  onItemPaged(data: PagedResponseDTO<AreaItemDto>) {
    this.itemPage = data.page;
    this.itemTotalPages = data.totalPages;
    this.itemTotalRecords = data.totalRecords;
  }

  changeTypePage(page: number) {
    this.typeList.load(page);
  }

  changeItemPage(page: number) {
    this.itemList.load(page);
  }

  onTypeCreated() {
    this.showCreateTypeModal = false;
    this.typeList.load(this.typePage || 1);
    // Refrescar lista de items por si los desplegables muestran tipos
    this.itemList.loadAreaTypes();
  }

  onItemCreated() {
    this.showCreateItemModal = false;
    this.itemList.load(this.itemPage || 1);
  }

  // Si se cambia/elimina un tipo, refrescar items (descripciones de tipo)
  onTypesChanged() {
    this.itemList.loadAreaTypes();
    this.itemList.load(this.itemPage || 1);
  }
}
