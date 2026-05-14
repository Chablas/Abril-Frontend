import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AreaCreate } from './area-create/area-create';
import { AreaList } from './area-list/area-list';
import { SubAreaCreate } from './sub-area-create/sub-area-create';
import { SubAreaList } from './sub-area-list/sub-area-list';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { AreaPagedDTO } from '../dtos/areaPaged.model';
import { SubAreaPagedDTO } from '../dtos/subAreaPaged.model';

@Component({
  selector: 'app-areas',
  imports: [CommonModule, FormsModule, AreaCreate, AreaList, SubAreaCreate, SubAreaList, Paginator],
  templateUrl: './areas.html',
  styleUrl: './areas.css',
})
export class Areas {
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  currentSubAreaPage = 1;
  totalSubAreaPages = 0;
  totalSubAreaRecords = 0;

  showCreateModal = false;
  showCreateSubAreaModal = false;

  @ViewChild(AreaList) arealist!: AreaList;
  @ViewChild(SubAreaList) subarealist!: SubAreaList;

  constructor(private cdr: ChangeDetectorRef) {}

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  openCreateSubAreaModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateSubAreaModal = true;
    this.cdr.detectChanges();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.arealist.loadAreas(page);
  }

  changeSubAreaPage(page: number) {
    this.currentSubAreaPage = page;
    this.subarealist.loadSubAreas(page);
  }

  reloadAreas() {
    this.arealist.loadAreas(this.currentPage);
    this.subarealist.loadAreaOptions();
  }

  reloadSubAreas() {
    this.subarealist.loadSubAreas(this.currentSubAreaPage);
  }

  updatePagination(data: AreaPagedDTO) {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.pageSize = data.pageSize;
    this.totalRecords = data.totalRecords;
  }

  updateSubAreaPagination(data: SubAreaPagedDTO) {
    this.currentSubAreaPage = data.page;
    this.totalSubAreaPages = data.totalPages;
    this.totalSubAreaRecords = data.totalRecords;
  }
}
