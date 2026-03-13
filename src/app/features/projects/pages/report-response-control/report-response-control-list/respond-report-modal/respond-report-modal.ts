import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { ResidentReportIncidenceService } from '../../../../../../core/services/residentReportIncidence.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-respond-report-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './respond-report-modal.html',
  styleUrl: './respond-report-modal.css',
})
export class RespondReportModal {
  /*@Input() editDto: AreaEditDTO = {
    areaId: 0,
    areaDescription: '',
    active: true,
  };*/

  @Input() showEditModal: boolean = false;
  @Output() closeEditModal = new EventEmitter<void>();

  @Output() loadAreas = new EventEmitter();

  constructor(
    private residentReportIncidenceService: ResidentReportIncidenceService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  /*respondArea(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.areaDescription.trim()) {
      return;
    }
    this.loaderService.show();
    this.projectResidentService.editArea(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.closeEditModal.emit();
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.loadAreas.emit();
        Swal.fire({
          title: response.message ?? 'Proyecto actualizado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }*/

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.closeEditModal.emit();
      return;
    }
    if (event.target === event.currentTarget) {
      this.closeEditModal.emit();
    }
  }
}
