import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkItemList } from './list/list';
import { WorkItemCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { WorkItemFilterDto } from '../dtos/work-item-filter.dto';
import { WorkItemDto } from '../dtos/work-item.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';

@Component({
  selector: 'app-work-item',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkItemList, WorkItemCreate, Paginator],
  templateUrl: './work-item.html',
})
export class WorkItem implements OnInit {
  @ViewChild(WorkItemList) list!: WorkItemList;

  filters: WorkItemFilterDto = { description: null, page: 1 };

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

  onPagedData(data: PagedResponseDTO<WorkItemDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
