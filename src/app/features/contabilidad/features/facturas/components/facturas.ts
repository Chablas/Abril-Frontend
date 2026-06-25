import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';

import { InvoiceService } from '../services/invoice.service';
import {
  InvoiceDto,
  InvoiceSupplierDto,
  InvoicePaymentFormDto,
  InvoiceFilterDto,
} from '../dtos/invoice.dtos';
import { FacturaCreate } from './create/create';

@Component({
  selector: 'app-facturas',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, SearchSelect, FacturaCreate, AbrilPageHeaderComponent],
  templateUrl: './facturas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class Facturas implements OnInit {
  anioActual = new Date().getFullYear();

  invoices: InvoiceDto[] = [];
  suppliers: InvoiceSupplierDto[] = [];
  paymentForms: InvoicePaymentFormDto[] = [];

  filters: InvoiceFilterDto = { search: null, contributorId: null, page: 1 };
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;

  constructor(
    private service: InvoiceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadInit();
  }

  /** Primera carga: desplegables + tabla en una sola petición. */
  private loadInit(): void {
    this.loaderService.show();
    this.service.getInit(this.filters).subscribe({
      next: (res) => {
        this.suppliers = res.suppliers;
        this.paymentForms = res.paymentForms;
        this.applyPaged(res.invoices);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Recarga solo la tabla (al filtrar o paginar). */
  loadTable(page: number = 1): void {
    this.filters.page = page;
    this.loaderService.show();
    this.service.getPaged(this.filters).subscribe({
      next: (res) => {
        this.applyPaged(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private applyPaged(res: { data: InvoiceDto[]; page: number; totalPages: number; totalRecords: number }): void {
    this.invoices = res.data;
    this.currentPage = res.page;
    this.totalPages = res.totalPages;
    this.totalRecords = res.totalRecords;
  }

  onSearch(): void {
    this.loadTable(1);
  }

  onSupplierFilterChange(contributorId: number | null): void {
    this.filters.contributorId = contributorId;
    this.loadTable(1);
  }

  onPageChange(page: number): void {
    this.loadTable(page);
  }

  openCreate(): void {
    this.showCreateModal = true;
  }

  onCreateClosed(): void {
    this.showCreateModal = false;
  }

  /** Tras guardar una factura: recarga tabla y desplegables (puede haber un proveedor nuevo). */
  onCreated(): void {
    this.showCreateModal = false;
    this.loadInit();
  }
}
