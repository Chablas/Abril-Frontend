import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

import { InvoiceService } from '../../services/invoice.service';
import {
  InvoiceSupplierDto,
  InvoicePaymentFormDto,
  InvoiceSupplierCreateDto,
} from '../../dtos/invoice.dtos';

@Component({
  selector: 'app-factura-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, FileSelector],
  templateUrl: './create.html',
  styleUrl: './create.css',
})
export class FacturaCreate {
  @Input() suppliers: InvoiceSupplierDto[] = [];
  @Input() paymentForms: InvoicePaymentFormDto[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // ── Formulario de factura ──────────────────────────────────────────
  form = {
    issueDate: '',
    invoiceNumber: '',
    contributorId: null as number | null,
    description: '',
    invoicePaymentFormId: null as number | null,
    total: null as number | null,
  };
  documentFile: File | null = null;
  documentName = '';

  // ── Modal de nuevo proveedor (consulta RUC) ────────────────────────
  showSupplierModal = false;
  rucInput = '';
  supplierLookupDone = false;
  newSupplier: InvoiceSupplierCreateDto = this.emptySupplier();

  constructor(
    private service: InvoiceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  private emptySupplier(): InvoiceSupplierCreateDto {
    return {
      contributorRuc: '',
      contributorName: '',
      contributorAddress: '',
      contributorEconomicActivityDescription: '',
      contributorDistrict: '',
      contributorProvince: '',
      contributorDepartment: '',
    };
  }

  get selectedSupplierRuc(): string {
    const s = this.suppliers.find((x) => x.contributorId === this.form.contributorId);
    return s ? s.contributorRuc : '';
  }

  // ── Acciones del modal de proveedor ────────────────────────────────
  openSupplierModal(): void {
    this.rucInput = '';
    this.supplierLookupDone = false;
    this.newSupplier = this.emptySupplier();
    this.showSupplierModal = true;
  }

  closeSupplierModal(): void {
    this.showSupplierModal = false;
  }

  searchRuc(): void {
    const ruc = this.rucInput.trim();
    if (ruc.length !== 11) {
      Swal.fire({ icon: 'error', title: 'RUC inválido', text: 'El RUC debe tener 11 dígitos.' });
      return;
    }
    this.loaderService.show();
    this.service.getByRuc(ruc).subscribe({
      next: (data) => {
        this.newSupplier = {
          contributorRuc: data.contributorRuc,
          contributorName: data.contributorName,
          contributorAddress: data.contributorAddress,
          contributorEconomicActivityDescription: data.contributorEconomicActivityDescription,
          contributorDistrict: data.contributorDistrict ?? '',
          contributorProvince: data.contributorProvince ?? '',
          contributorDepartment: data.contributorDepartment ?? '',
        };
        this.supplierLookupDone = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'RUC no encontrado', text: 'No se encontró información para el RUC ingresado.' });
          return;
        }
        const backendMsg = err.error?.message as string | undefined;
        if (backendMsg) {
          Swal.fire({ icon: 'warning', title: 'No se pudo consultar', text: backendMsg });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  saveSupplier(): void {
    if (!this.newSupplier.contributorName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'La razón social es obligatoria.' });
      return;
    }
    this.loaderService.show();
    this.service.createSupplier(this.newSupplier).subscribe({
      next: (supplier) => {
        this.loaderService.hide();
        // Agregar al desplegable y seleccionarlo
        this.suppliers = [supplier, ...this.suppliers.filter((s) => s.contributorId !== supplier.contributorId)];
        this.form.contributorId = supplier.contributorId;
        this.showSupplierModal = false;
        Swal.fire({ icon: 'success', title: 'Proveedor registrado', timer: 1400, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Documento ──────────────────────────────────────────────────────
  onFileSelected(file: SelectedFile): void {
    this.documentFile = file.file;
    this.documentName = file.file.name;
  }

  removeFile(): void {
    this.documentFile = null;
    this.documentName = '';
  }

  // ── Guardar factura ────────────────────────────────────────────────
  save(): void {
    if (!this.form.issueDate) return this.requiredAlert('Ingrese la fecha de emisión.');
    if (!this.form.invoiceNumber.trim()) return this.requiredAlert('Ingrese el número de factura.');
    if (!this.form.contributorId) return this.requiredAlert('Seleccione un proveedor.');
    if (!this.form.description.trim()) return this.requiredAlert('Ingrese la descripción del bien o servicio.');
    if (!this.form.invoicePaymentFormId) return this.requiredAlert('Seleccione la forma de pago.');
    if (this.form.total == null || this.form.total <= 0) return this.requiredAlert('Ingrese un total válido.');

    const formData = new FormData();
    formData.append('IssueDate', this.form.issueDate);
    formData.append('InvoiceNumber', this.form.invoiceNumber.trim());
    formData.append('ContributorId', this.form.contributorId.toString());
    formData.append('Description', this.form.description.trim());
    formData.append('InvoicePaymentFormId', this.form.invoicePaymentFormId.toString());
    formData.append('Total', this.form.total.toString());
    if (this.documentFile) formData.append('DocumentFile', this.documentFile, this.documentFile.name);

    this.loaderService.show();
    this.service.create(formData).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Factura registrada exitosamente', timer: 1500, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private requiredAlert(text: string): void {
    Swal.fire({ icon: 'error', title: 'Campo requerido', text });
  }
}
