import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportResponseControlCreate } from './report-response-control-create/report-response-control-create';
import { ReportResponseControlList } from './report-response-control-list/report-response-control-list';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ResidentReportIncidenceDTO } from '../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { Paginator } from '../../../../shared/components/paginator/paginator';

@Component({
  selector: 'app-report-response-control',
  imports: [CommonModule, ReportResponseControlCreate, ReportResponseControlList, Paginator],
  templateUrl: './report-response-control.html',
  styleUrl: './report-response-control.css',
})
export class ReportResponseControl {
  showCreateModal = false;

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  @ViewChild(ReportResponseControlList) reportResponseControlList!: ReportResponseControlList;

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  changePage(page: number) {
    this.currentPage = page;
    this.reportResponseControlList.loadResidentReports(page);
  }

  updatePagination(data: PagedResponseDTO<ResidentReportIncidenceDTO>) {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.pageSize = data.pageSize;
    this.totalRecords = data.totalRecords;
  }
}
