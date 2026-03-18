import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { ResidentReportIncidenceService } from '../../../../../../core/services/residentReportIncidence.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';
import { ResidentReportResponseCreateDto } from '../../../../../../core/dtos/reportResponseControl/responseCreateDto.model';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { ResidentReportIncidenceDTO } from '../../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';

@Component({
  selector: 'app-respond-report-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './respond-report-modal.html',
  styleUrl: './respond-report-modal.css',
})
export class RespondReportModal {
  @Input() selectedReportIncidenceId: number = 0;

  createDto: ResidentReportResponseCreateDto = {
    residentReportIncidenceId: 0,
    residentResponseDescription: '',
  };

  @Input() showEditModal: boolean = false;
  @Output() closeResponseModal = new EventEmitter<void>();

  @Output() loadAreas = new EventEmitter();

  constructor(
    private residentReportIncidenceService: ResidentReportIncidenceService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  createResponse(event: MouseEvent) {
    event.stopPropagation();
    if (!this.createDto.residentResponseDescription.trim()) {
      return;
    }
    this.createDto.residentReportIncidenceId = this.selectedReportIncidenceId;
    this.loaderService.show();
    this.residentReportIncidenceService.createResponse(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.closeResponseModal.emit();
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.loadAreas.emit();
        Swal.fire({
          title: response.message ?? 'Item creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.closeResponseModal.emit();
      return;
    }
    if (event.target === event.currentTarget) {
      this.closeResponseModal.emit();
    }
  }
}
