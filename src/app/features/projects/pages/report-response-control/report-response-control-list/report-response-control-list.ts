import { Component, ChangeDetectorRef, Output, EventEmitter, OnInit } from '@angular/core';
import { ResidentReportIncidenceService } from '../../../../../core/services/residentReportIncidence.service';
import { ResidentReportIncidenceDTO } from '../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { RespondReportModal } from './respond-report-modal/respond-report-modal';

@Component({
  selector: 'app-report-response-control-list',
  imports: [CommonModule, FormsModule, RespondReportModal],
  templateUrl: './report-response-control-list.html',
  styleUrl: './report-response-control-list.css',
})
export class ReportResponseControlList implements OnInit {

  showResponseModal = false;

  selectedReportIncidenceId: number = 0;

  tableData: PagedResponseDTO<ResidentReportIncidenceDTO> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  }

  @Output() pagedData = new EventEmitter<PagedResponseDTO<ResidentReportIncidenceDTO>>();

  constructor(
    private residentReportIncidenceService: ResidentReportIncidenceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadResidentReports();
  }
  loadResidentReports(page: number = 1) {
    this.loaderService.show();
    this.residentReportIncidenceService.getReportsPaged(page).subscribe({
      next: (response) => {
        this.tableData = response;
        this.pagedData.emit(response);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    });
  }
  openResponseModal(item: ResidentReportIncidenceDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showResponseModal = true;
    this.selectedReportIncidenceId = item.residentReportIncidenceId;
  }
}
