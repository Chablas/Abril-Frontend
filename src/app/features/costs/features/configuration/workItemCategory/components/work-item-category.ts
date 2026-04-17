import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkItemCategoryList } from './list/list';
import { WorkItemCategoryCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { WorkItemCategoryFilterDto } from '../dtos/work-item-category-filter.dto';
import { WorkItemCategoryDto } from '../dtos/work-item-category.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';

@Component({
  selector: 'app-work-item-category',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkItemCategoryList, WorkItemCategoryCreate, Paginator],
  templateUrl: './work-item-category.html',
})
export class WorkItemCategory implements OnInit {
  @ViewChild(WorkItemCategoryList) list!: WorkItemCategoryList;

  filters: WorkItemCategoryFilterDto = { description: null, page: 1 };

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;

  ngOnInit(): void {}

  onSearch(): void {
    this.list.load(1);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.list.load(page);
  }

  onPagedData(data: PagedResponseDTO<WorkItemCategoryDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
