import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceFolderList } from './list/list';
import { InvoiceFolderCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { InvoiceFolderFilterDto, InvoiceFolderDto } from '../dtos/invoice-folder.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';

/**
 * Subsección "Carpeta facturas" de la Configuración de Contabilidad.
 * Permite registrar carpetas de OneDrive (con un nombre identificativo como
 * "Facturas urgentes") donde se guardarán las facturas.
 */
@Component({
  selector: 'app-invoice-folder',
  standalone: true,
  imports: [CommonModule, FormsModule, InvoiceFolderList, InvoiceFolderCreate, Paginator],
  templateUrl: './invoice-folder.html',
})
export class InvoiceFolder implements OnInit {
  @ViewChild(InvoiceFolderList) list!: InvoiceFolderList;

  filters: InvoiceFolderFilterDto = { page: 1 };

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;

  ngOnInit(): void {}

  onPageChange(page: number): void {
    this.currentPage = page;
    this.list.load(page);
  }

  onPagedData(data: PagedResponseDTO<InvoiceFolderDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
