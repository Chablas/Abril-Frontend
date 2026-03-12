import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { AreaService } from '../../../../../../../core/services/area.service';
import { AreaEditDTO } from '../../../../../../../core/dtos/area/areaEdit.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiMessageDTO } from '../../../../../../../core/dtos/api/ApiMessage.model';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-area-edit',
  imports: [CommonModule, FormsModule],
  templateUrl: './area-edit.html',
  styleUrl: './area-edit.css',
})
export class AreaEdit {
  @Input() editDto: AreaEditDTO = {
    areaId: 0,
    areaDescription: '',
    active: true,
  };

  @Input() showEditModal: boolean = false;
  @Output() closeEditModal = new EventEmitter<void>();

  @Output() loadAreas = new EventEmitter();

  constructor(
    private areaService: AreaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService
  ) {}

  editArea(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.areaDescription.trim()) {
      return;
    }
    this.loaderService.show();
    this.areaService.editArea(this.editDto).subscribe({
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
  }

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
