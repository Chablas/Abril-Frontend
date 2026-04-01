import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ProjectSubContractorCreateDTO } from '../../dtos/projectSubContractorCreateDto.model';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { ImagePreview } from '../../../../../shared/components/image-preview/image-preview';
import { AdjudicacionesService } from '../../services/adjudicaciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectSubContractorFormDataDTO } from '../../dtos/projectSubContractorFormDataDTO.model';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { FilePreview, FilePreviewItem } from '../../../../../shared/components/file-preview/file-preview';
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
    companies: []
  }

  createDto: ProjectSubContractorCreateDTO = {
    projectId: 0,
    companyId: 0,
    contractId: 0,
    contractTypeId: 0,
    contractOriginId: 0,
    paymentMethodId: 0,
    amount: 0,
    currencyId: 0,
    hasIgv: false,
    contractorEmail: '',
    workItemId: 0,
    quotationFiles: [],
    comparativeFiles: [],
  };

  quotationFileItems: FilePreviewItem[] = [];
  comparativeFileItems: FilePreviewItem[] = [];
  maxFiles = 1;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService
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
    form.append('companyId', this.createDto.companyId.toString());
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

  blockExtraDecimals(event: Event) {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,2}/);
    let clamped = match ? match[0] : '';
    const numeric = parseFloat(clamped);
    if (!isNaN(numeric) && numeric > 100) {
      clamped = '100';
    }
    if (input.value !== clamped) {
      input.value = clamped;
    }
    this.createDto.advancePercentage = clamped !== '' ? parseFloat(clamped) : undefined;
  }
}
