import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { InvoiceFolderPicker } from '../../folder-picker/folder-picker';
import { InvoiceFolderService } from '../../../services/invoice-folder.service';
import { InvoiceFolderUpdateDto } from '../../../dtos/invoice-folder.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-invoice-folder-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, InvoiceFolderPicker],
  templateUrl: './edit.html',
})
export class InvoiceFolderEdit {
  @Input() dto: InvoiceFolderUpdateDto = { invoiceFolderId: 0, name: '', linkUrl: '', driveId: '', folderId: '', active: true };
  @Input() folderName: string | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private service: InvoiceFolderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  onFolderSelected(e: { driveId: string; folderId: string; folderName: string }): void {
    this.dto.driveId = e.driveId;
    this.dto.folderId = e.folderId;
  }

  save(): void {
    if (!this.dto.name.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa un nombre para la carpeta.' });
      return;
    }
    if (!this.dto.linkUrl.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa el link de la carpeta.' });
      return;
    }
    if (!this.dto.driveId || !this.dto.folderId) {
      Swal.fire({ icon: 'warning', title: 'Selecciona una carpeta', text: 'Pulsa "Detectar" y elige la carpeta de destino.' });
      return;
    }

    this.loaderService.show();
    this.service.update({ ...this.dto, name: this.dto.name.trim(), linkUrl: this.dto.linkUrl.trim() }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Carpeta actualizada exitosamente', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
