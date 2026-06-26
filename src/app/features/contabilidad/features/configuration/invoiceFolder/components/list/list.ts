import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { InvoiceFolderService } from '../../services/invoice-folder.service';
import { InvoiceFolderDto, InvoiceFolderUpdateDto, InvoiceFolderFilterDto } from '../../dtos/invoice-folder.dto';
import { InvoiceFolderEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-invoice-folder-list',
  standalone: true,
  imports: [CommonModule, InvoiceFolderEdit],
  templateUrl: './list.html',
})
export class InvoiceFolderList implements OnInit {
  @Input() filters: InvoiceFolderFilterDto = { page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<InvoiceFolderDto>>();

  items: InvoiceFolderDto[] = [];
  showEditModal = false;
  editDto: InvoiceFolderUpdateDto = { invoiceFolderId: 0, name: '', linkUrl: '', driveId: '', folderId: '', active: true };
  editFolderName: string | null = null;

  constructor(
    private service: InvoiceFolderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.load(1));
  }

  load(page: number = 1): void {
    this.loaderService.show();
    this.service.getPaged({ ...this.filters, page }).subscribe({
      next: (res) => {
        this.items = res.data;
        this.pagedData.emit(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEdit(item: InvoiceFolderDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      invoiceFolderId: item.invoiceFolderId,
      name: item.name,
      linkUrl: item.linkUrl,
      driveId: item.driveId,
      folderId: item.folderId,
      active: item.active,
    };
    this.editFolderName = item.folderName ?? null;
    this.showEditModal = true;
  }

  delete(id: number, event: MouseEvent): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.delete(id).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Eliminado correctamente', confirmButtonColor: '#64BC04' });
          this.load(1);
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
