import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { AreaTypeDto } from '../dtos/areaType.model';
import { AreaItemDto } from '../dtos/areaItem.model';
import { AreaTypeList } from './area-type/area-type-list';
import { AreaTypeCreate } from './area-type/area-type-create';
import { AreaItemList } from './area-item/area-item-list';
import { AreaItemCreate } from './area-item/area-item-create';
import { AreaScopeList } from './area-scope/area-scope-list';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';

import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';
type AreaSection = 'items' | 'scope' | 'types';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [
    CommonModule,
    Paginator,
    SectionTabs,
    FilterTriggerButton,
    AreaTypeList,
    AreaTypeCreate,
    AreaItemList,
    AreaItemCreate,
    AreaScopeList,
    AbrilPageHeaderComponent,
  ],
  templateUrl: './area.html',
  styleUrl: './area.css',
})
export class Area {
  readonly tabs = CONFIGURACION_TABS;
  @ViewChild(AreaTypeList) typeList!: AreaTypeList;
  @ViewChild(AreaItemList) itemList!: AreaItemList;
  @ViewChild(AreaScopeList) scopeList!: AreaScopeList;

  activeSection: AreaSection = 'items';
  readonly sectionTabs: SectionTab[] = [
    { id: 'items', label: 'Áreas' },
    { id: 'scope', label: 'Jerarquía' },
    { id: 'types', label: 'Tipos de área' },
  ];

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

  onSectionChange(id: string): void {
    this.activeSection = id as AreaSection;
  }

  /** Etiqueta del botón flotante de crear, según la sección visible. */
  get botonPrimario(): { label: string; icono: string } {
    const label =
      this.activeSection === 'items'
        ? 'Nueva área'
        : this.activeSection === 'scope'
          ? 'Nueva relación'
          : 'Nuevo tipo';
    return { label, icono: 'ti-plus' };
  }

  onCreate(): void {
    switch (this.activeSection) {
      case 'items':
        this.showCreateItemModal = true;
        this.cdr.detectChanges();
        break;
      case 'scope':
        this.scopeList?.openCreateBranch();
        break;
      case 'types':
        this.showCreateTypeModal = true;
        this.cdr.detectChanges();
        break;
    }
  }

  /** Componente de la sección visible (solo uno existe a la vez por el *ngIf). */
  private get activeCmp(): AreaItemList | AreaScopeList | AreaTypeList | undefined {
    switch (this.activeSection) {
      case 'items': return this.itemList;
      case 'scope': return this.scopeList;
      case 'types': return this.typeList;
      default: return undefined;
    }
  }

  get filtrosActivos(): number {
    return this.activeCmp?.filtrosActivos ?? 0;
  }

  /** Abre el modal de filtros de la sección visible (botón proyectado en el header). */
  onOpenFilters(): void {
    const cmp = this.activeCmp;
    if (!cmp) return;
    cmp.filtrosAbiertos = true;
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
    this.itemList?.loadAreaTypes();
  }

  onItemCreated() {
    this.showCreateItemModal = false;
    this.itemList.load(this.itemPage || 1);
    this.scopeList?.load();
  }

  onTypesChanged() {
    this.itemList?.loadAreaTypes();
    this.itemList?.load(this.itemPage || 1);
  }
}
