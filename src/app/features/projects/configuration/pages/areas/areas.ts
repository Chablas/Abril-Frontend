import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AreaCreate } from "./area-create/area-create";
import { AreaList } from "./area-list/area-list";
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { AreaPagedDTO } from '../../../../../core/dtos/area/areaPaged.model';

@Component({
  selector: 'app-areas',
  imports: [CommonModule, FormsModule, AreaCreate, AreaList, Paginator],
  templateUrl: './areas.html',
  styleUrl: './areas.css',
})
export class Areas {
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  showCreateModal = false;

  @ViewChild(AreaList) arealist!: AreaList;

  constructor(private cdr: ChangeDetectorRef) {}

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.arealist.loadAreas(page);
  }

  reloadAreas() {
    this.arealist.loadAreas(this.currentPage);
  }

  updatePagination(data: AreaPagedDTO) {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.pageSize = data.pageSize;
    this.totalRecords = data.totalRecords;
  }
}
