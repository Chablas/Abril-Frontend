import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { InvoiceFolderPicker } from '../folder-picker/folder-picker';
import { InvoiceFolderService } from '../../services/invoice-folder.service';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-invoice-folder-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, InvoiceFolderPicker],
  templateUrl: './create.html',
})
export class InvoiceFolderCreate {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  name = '';
  linkUrl = '';
  driveId: string | null = null;
  folderId: string | null = null;
  folderName: string | null = null;

  constructor(
    private service: InvoiceFolderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  onFolderSelected(e: { driveId: string; folderId: string; folderName: string }): void {
    this.driveId = e.driveId;
    this.folderId = e.folderId;
    this.folderName = e.folderName;
  }

  save(): void {
    if (!this.name.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa un nombre para la carpeta (ej. "Facturas urgentes").' });
      return;
    }
    if (!this.linkUrl.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa el link de la carpeta.' });
      return;
    }
    if (!this.driveId || !this.folderId) {
      Swal.fire({ icon: 'warning', title: 'Selecciona una carpeta', text: 'Pulsa "Detectar" y elige la carpeta donde se guardarán las facturas.' });
      return;
    }

    this.loaderService.show();
    this.service
      .create({ name: this.name.trim(), linkUrl: this.linkUrl.trim(), driveId: this.driveId, folderId: this.folderId })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Carpeta registrada exitosamente', draggable: true });
          this.saved.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
