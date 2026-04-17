import { Component, EventEmitter, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { ProjectSubContractorCreateDTO } from '../../dtos/projectSubContractorCreateDto.model';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { AdjudicacionesService } from '../../services/adjudicaciones.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectSubContractorFormDataDTO } from '../../dtos/projectSubContractorFormDataDTO.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { FilePreview, FilePreviewItem } from '../../../../../../shared/components/file-preview/file-preview';
import Swal from 'sweetalert2';

@Component({
  standalone: true,
  selector: 'app-create',
  imports: [BaseModal, CommonModule, FormsModule, FileSelector, FilePreview, SearchSelect],
  templateUrl: './create.html',
  styleUrl: './create.css',
})
export class Create implements OnInit {
  createFormData: ProjectSubContractorFormDataDTO = {
    projects: [],
    contracts: [],
    contractTypes: [],
    contractOrigins: [],
    paymentMethods: [],
    currencies: [],
    workItems: [],
    companies: [],
    workItemCategories: []
  }

  createDto: ProjectSubContractorCreateDTO = {
    projectId: 0,
    contractorId: 0,
    contractId: 0,
    contractTypeId: 0,
    contractOriginId: 0,
    paymentMethodId: 0,
    amount: 0,
    currencyId: 0,
    hasIgv: false,
    contractorEmail: '',
    workItemId: 0,
    workItemCategoryId: 0,
    quotationFiles: [],
    comparativeFiles: [],
  };

  emailOptions: { email: string }[] = [];
  advanceAmount: number | undefined = undefined;

  quotationFileItems: FilePreviewItem[] = [];
  comparativeFileItems: FilePreviewItem[] = [];
  readonly maxQuotationFiles = 3;
  readonly maxComparativeFiles = 1;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.getFormData();
    });
  }

  onQuotationImageSelected(file: SelectedFile) {
    this.quotationFileItems.push({ name: file.file.name, size: this.formatFileSize(file.file.size) });
    this.createDto.quotationFiles!.push(file.file);
  }

  onComparativeImageSelected(file: SelectedFile) {
    this.comparativeFileItems.push({ name: file.file.name, size: this.formatFileSize(file.file.size) });
    this.createDto.comparativeFiles!.push(file.file);
  }

  removeQuotationFile(index: number) {
    this.quotationFileItems.splice(index, 1);
    this.createDto.quotationFiles!.splice(index, 1);
  }

  removeComparativeFile(index: number) {
    this.comparativeFileItems.splice(index, 1);
    this.createDto.comparativeFiles!.splice(index, 1);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  get selectedCurrencyCode(): string {
    return this.createFormData.currencies.find(c => c.currencyId === this.createDto.currencyId)?.currencyCode ?? '';
  }

  onCompanyChange(contractorId: number): void {
    this.createDto.contractorId = contractorId;
    const contractor = this.createFormData.companies.find(c => c.contractorId === contractorId);
    this.emailOptions = (contractor?.emails ?? []).map(e => ({ email: e }));
    this.createDto.contractorEmail = this.emailOptions[0]?.email ?? '';
  }

  getFormData() {
    this.loaderService.show();
    this.adjudicacionesService.getFormData().subscribe({
      next: (response) => {
        this.createFormData = response;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    })
  }

  save() {
    const form = new FormData();
    form.append('projectId', this.createDto.projectId.toString());
    form.append('contractorId', this.createDto.contractorId.toString());
    form.append('contractId', this.createDto.contractId.toString());
    form.append('contractTypeId', this.createDto.contractTypeId.toString());
    form.append('contractOriginId', this.createDto.contractOriginId.toString());
    form.append('paymentMethodId', this.createDto.paymentMethodId.toString());
    if (this.createDto.paymentMethodId === 2 && this.createDto.advancePercentage != null) {
      form.append('advancePercentage', this.createDto.advancePercentage.toString());
    }
    form.append('amount', this.createDto.amount.toString());
    form.append('currencyId', this.createDto.currencyId.toString());
    form.append('hasIgv', this.createDto.hasIgv.toString());
    form.append('contractorEmail', this.createDto.contractorEmail);
    form.append('workItemId', this.createDto.workItemId.toString());
    form.append('workItemCategoryId', this.createDto.workItemCategoryId.toString());
    this.createDto.quotationFiles?.forEach(f => form.append('quotationFiles', f));
    this.createDto.comparativeFiles?.forEach(f => form.append('comparativeFiles', f));

    this.loaderService.show();
    this.adjudicacionesService.createAdjudicacion(form).subscribe({
      next: (response) => {
        this.loaderService.hide();
        Swal.fire({ title: response.message ?? 'Adjudicación creada exitosamente', icon: 'success', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    });
  }

  onAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,6}/);
    let clamped = match ? match[0] : '';
    if (input.value !== clamped) {
      input.value = clamped;
    }
    this.createDto.amount = clamped !== '' ? parseFloat(clamped) : 0;

    // Recalculate advance amount whenever the base amount changes
    this.advanceAmount = null as any;
    this.cdr.detectChanges();
    if (this.createDto.advancePercentage != null && this.createDto.amount) {
      const raw = (this.createDto.advancePercentage / 100) * this.createDto.amount;
      this.advanceAmount = Math.round(raw * 1_000_000) / 1_000_000;
    } else {
      this.advanceAmount = undefined;
    }
  }

  onPercentageInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,6}/);
    let clamped = match ? match[0] : '';
    const numeric = parseFloat(clamped);
    if (!isNaN(numeric) && numeric > 100) {
      clamped = '100';
    }
    if (input.value !== clamped) {
      input.value = clamped;
    }
    this.createDto.advancePercentage = clamped !== '' ? parseFloat(clamped) : undefined;

    // Reset to null first so Angular replaces the DOM value of the other input
    // instead of skipping the update because the reference looks the same.
    this.advanceAmount = null as any;
    this.cdr.detectChanges();

    if (this.createDto.advancePercentage != null && this.createDto.amount) {
      // Math.round is safe here: pct→amount can never accidentally reach the total
      const raw = (this.createDto.advancePercentage / 100) * this.createDto.amount;
      this.advanceAmount = Math.round(raw * 1_000_000) / 1_000_000;
    } else {
      this.advanceAmount = undefined;
    }
  }

  onAdvanceAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,6}/);
    let clamped = match ? match[0] : '';
    const numeric = parseFloat(clamped);
    if (!isNaN(numeric) && this.createDto.amount && numeric > this.createDto.amount) {
      clamped = this.createDto.amount.toString();
    }
    if (input.value !== clamped) {
      input.value = clamped;
    }
    this.advanceAmount = clamped !== '' ? parseFloat(clamped) : undefined;

    // Reset to null first so Angular replaces the DOM value of the other input
    // instead of skipping the update because the reference looks the same.
    this.createDto.advancePercentage = null as any;
    this.cdr.detectChanges();

    if (this.advanceAmount != null && this.createDto.amount) {
      // Math.floor to prevent e.g. 499.9999 / 500 rounding up to 100%.
      // 1e-9 epsilon corrects IEEE 754 cases where x*1_000_000 lands just
      // below an integer (e.g. 4.9999999...) without affecting real values.
      const raw = (this.advanceAmount / this.createDto.amount) * 100;
      this.createDto.advancePercentage = Math.floor(raw * 1_000_000 + 1e-9) / 1_000_000;
    } else {
      this.createDto.advancePercentage = undefined;
    }
  }
}
