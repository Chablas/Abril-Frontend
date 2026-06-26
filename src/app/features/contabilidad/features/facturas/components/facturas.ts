import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ViewToggle } from '../../../../../shared/components/view-toggle/view-toggle';
import { ViewToggleMode } from '../../../../../shared/components/view-toggle/view-toggle.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';

import { InvoiceService } from '../services/invoice.service';
import {
  InvoiceDto,
  InvoiceSupplierDto,
  InvoicePaymentFormDto,
  InvoiceFolderOptionDto,
  InvoiceCurrencyDto,
  InvoiceDetailDto,
  InvoiceBlockGroupDto,
  InvoiceFilterDto,
} from '../dtos/invoice.dtos';
import { FacturaCreate } from './create/create';
import { FacturaImport } from './import/import';
import { FacturaDetail } from './detail/detail';
import { FacturaEdit } from './edit/edit';
import { FacturaAttach } from './attach/attach';

@Component({
  selector: 'app-facturas',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, SearchSelect, ViewToggle, FacturaCreate, FacturaImport, FacturaDetail, FacturaEdit, FacturaAttach, AbrilPageHeaderComponent],
  templateUrl: './facturas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class Facturas implements OnInit {
  anioActual = new Date().getFullYear();

  invoices: InvoiceDto[] = [];
  suppliers: InvoiceSupplierDto[] = [];
  paymentForms: InvoicePaymentFormDto[] = [];
  abrilCompanies: InvoiceSupplierDto[] = [];
  folders: InvoiceFolderOptionDto[] = [];
  currencies: InvoiceCurrencyDto[] = [];

  filters: InvoiceFilterDto = {
    search: null,
    serie: null,
    correlativo: null,
    contributorId: null,
    contributorRuc: null,
    abrilContributorId: null,
    abrilContributorRuc: null,
    invoicePaymentFormId: null,
    totalMin: null,
    totalMax: null,
    issueDateFrom: null,
    issueDateTo: null,
    page: 1,
  };
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;
  showImportModal = false;
  showAdvanced = false;

  // Ver detalle / editar
  detailInvoiceId: number | null = null;
  editDetail: InvoiceDetailDto | null = null;

  // Adjuntar documento (factura sin documento)
  attachInvoice: InvoiceDto | null = null;

  // Hover de bloques
  hoveredInvoice: InvoiceDto | null = null;
  popX = 0;
  popY = 0;

  onBlockEnter(inv: InvoiceDto, event: MouseEvent): void {
    this.hoveredInvoice = inv;
    this.movePopover(event);
  }

  movePopover(event: MouseEvent): void {
    // Posición fija junto al cursor, sin salir del viewport.
    const w = 300, h = 230, margin = 14;
    let x = event.clientX + margin;
    let y = event.clientY + margin;
    if (typeof window !== 'undefined') {
      if (x + w > window.innerWidth) x = event.clientX - w - margin;
      if (y + h > window.innerHeight) y = window.innerHeight - h - margin;
    }
    this.popX = Math.max(margin, x);
    this.popY = Math.max(margin, y);
  }

  onBlockLeave(): void {
    this.hoveredInvoice = null;
  }

  /** Clic en un bloque: si tiene documento lo abre en otra pestaña; si no, abre el modal para adjuntar. */
  onBlockClick(inv: InvoiceDto): void {
    this.hoveredInvoice = null;
    if (inv.documentUrl) {
      window.open(inv.documentUrl, '_blank', 'noopener');
    } else {
      this.attachInvoice = inv;
    }
  }

  closeAttach(): void {
    this.attachInvoice = null;
  }

  onAttached(): void {
    this.attachInvoice = null;
    this.loadBlocks();
  }

  // Vista bloques / tabla / tarjetas
  viewMode: 'blocks' | 'table' | 'cards' = 'blocks';
  blockGroups: InvoiceBlockGroupDto[] = [];
  readonly viewModes: ViewToggleMode[] = [
    {
      value: 'blocks',
      label: 'Bloques',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v5H4V4Zm0 7h16v5H4v-5Zm0 7h16v3H4v-3Z" stroke="currentColor" stroke-width="1.4"/></svg>',
    },
    {
      value: 'table',
      label: 'Tabla',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 5h18v14H3V5Zm0 5h18M3 15h18M9 5v14" stroke="currentColor" stroke-width="1.6"/></svg>',
    },
    {
      value: 'cards',
      label: 'Tarjetas',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" stroke-width="1.6"/></svg>',
    },
  ];

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
        this.abrilCompanies = res.abrilCompanies;
        this.folders = res.folders;
        this.currencies = res.currencies;
        this.applyPaged(res.invoices);
        this.loaderService.hide();
        this.loadBlocks();
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

  /** Carga las facturas agrupadas por razón social de Abril (vista de bloques). */
  loadBlocks(): void {
    this.loaderService.show();
    this.service.getBlocks(this.filters).subscribe({
      next: (groups) => {
        this.blockGroups = groups;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onViewModeChange(mode: string): void {
    this.viewMode = mode as 'blocks' | 'table' | 'cards';
    if (mode === 'blocks') this.loadBlocks();
  }

  onSearch(): void {
    if (this.viewMode === 'blocks') this.loadBlocks();
    else this.loadTable(1);
  }

  onPageChange(page: number): void {
    this.loadTable(page);
  }

  openCreate(): void {
    this.showImportModal = true;
  }

  openManualCreate(): void {
    this.showCreateModal = true;
  }

  onImported(): void {
    this.showImportModal = false;
    this.loadInit();
  }

  onCreateClosed(): void {
    this.showCreateModal = false;
  }

  /** Tras guardar una factura: recarga tabla y desplegables (puede haber un proveedor nuevo). */
  onCreated(): void {
    this.showCreateModal = false;
    this.loadInit();
  }

  // ── Ver detalle / editar ───────────────────────────────────────────
  openDetail(invoiceId: number): void {
    this.detailInvoiceId = invoiceId;
  }

  closeDetail(): void {
    this.detailInvoiceId = null;
  }

  onDetailEdit(detail: InvoiceDetailDto): void {
    this.detailInvoiceId = null;
    this.editDetail = detail;
  }

  closeEdit(): void {
    this.editDetail = null;
  }

  onEdited(): void {
    this.editDetail = null;
    this.loadTable(this.currentPage);
  }
}
