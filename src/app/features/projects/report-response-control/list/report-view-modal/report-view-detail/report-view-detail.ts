import { Component, ElementRef, Input, QueryList, ViewChildren } from '@angular/core';
import { ResidentReportIncidenceDTO } from '../../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ResidentReportIncidenceService } from '../../../../../../core/services/residentReportIncidence.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { UpdateIncidenceDTO } from '../../../../../../core/dtos/reportResponseControl/updateIncidence.model';

@Component({
  selector: 'app-report-view-detail',
  imports: [CommonModule],
  templateUrl: './report-view-detail.html',
  styleUrl: './report-view-detail.css',
})
export class ReportViewDetail {
  @Input() selectedIncidence: ResidentReportIncidenceDTO = {
    residentReportIncidenceId: 0,
    residentReportIncidenceDescription: '',
    projectId: 0,
    projectDescription: '',
    stateId: 0,
    stateDescription: '',
    images: [],
    residentReportResponseDescriptions: [],
  };

  updateDto: UpdateIncidenceDTO = {
    incidenceId: 0
  }

  constructor(
    public authService: AuthService,
    private residentReportIncidenceService: ResidentReportIncidenceService,
    private loaderService: LoaderService,
    private errorService: ErrorService
  ) {}

  updateIncidence() {
    this.loaderService.show();
    this.updateDto.incidenceId = this.selectedIncidence.residentReportIncidenceId;
    this.residentReportIncidenceService.updateIncidenceState(this.updateDto).subscribe({
      next: (response) => {
        this.loaderService.hide();
        Swal.fire({
          title: response.message ?? 'Item creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    })
  }
}
