import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkSpecialtyList } from './list/list';
import { WorkSpecialtyCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { WorkSpecialtyFilterDto } from '../dtos/work-specialty-filter.dto';
import { WorkSpecialtyDto } from '../dtos/work-specialty.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  selector: 'app-work-specialty',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkSpecialtyList, WorkSpecialtyCreate, Paginator, AbrilPageHeaderComponent],
  templateUrl: './work-specialty.html',
  styleUrl: './work-specialty.css',
})
export class WorkSpecialty implements OnInit {
  @ViewChild(WorkSpecialtyList) list!: WorkSpecialtyList;

  filters: WorkSpecialtyFilterDto = { description: null, page: 1 };

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

  onPagedData(data: PagedResponseDTO<WorkSpecialtyDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
