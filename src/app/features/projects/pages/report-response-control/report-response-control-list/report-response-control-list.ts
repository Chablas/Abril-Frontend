import { Component, ChangeDetectorRef, Output, EventEmitter, OnInit } from '@angular/core';
import { ResidentReportIncidenceService } from '../../../../../core/services/residentReportIncidence.service';
import { ResidentReportIncidenceDTO } from '../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-report-response-control-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './report-response-control-list.html',
  styleUrl: './report-response-control-list.css',
})
export class ReportResponseControlList implements OnInit {

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
    private errorService: ErrorService
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
}
