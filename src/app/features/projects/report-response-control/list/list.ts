import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { ResidentReportIncidenceService } from '../../../../core/services/residentReportIncidence.service';
import { ResidentReportIncidenceDTO } from '../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { AuthService } from '../../../../core/services/auth.service';
import { RespondReportModal } from './respond-report-modal/respond-report-modal';
import { ReportViewModal } from './report-view-modal/report-view-modal';

@Component({
  selector: 'app-list',
  imports: [CommonModule, FormsModule, RespondReportModal, ReportViewModal],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List implements OnInit {
  showResponseModal = false;
  showReportViewModal = false;
  selectedIncidence: ResidentReportIncidenceDTO = {
    residentReportIncidenceId: 0,
    residentReportIncidenceDescription: '',
    projectId: 0,
    projectDescription: '',
    stateId: 0,
    stateDescription: '',
    images: [],
    residentReportResponseDescriptions: []
  };

  selectedReportIncidenceId: number = 0;

  tableData: PagedResponseDTO<ResidentReportIncidenceDTO> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  @Output() pagedData = new EventEmitter<PagedResponseDTO<ResidentReportIncidenceDTO>>();

  constructor(
    private residentReportIncidenceService: ResidentReportIncidenceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.loadResidentReports());
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
      },
    });
  }
  openResponseModal(item: ResidentReportIncidenceDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showResponseModal = true;
    this.selectedReportIncidenceId = item.residentReportIncidenceId;
  }
  openReportViewModal(item: ResidentReportIncidenceDTO) {
    this.selectedIncidence = item;
    this.showReportViewModal = true;
  }

  loadListData(page: number = 1) {
    this.loaderService.show();

    this.residentReportIncidenceService.getReportsPaged(page).subscribe({
      next: (response) => {
        this.tableData = response;
        this.pagedData.emit(response);

        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
