import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ContractorService } from '../services/contractor.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { SunatContributorDTO } from '../dtos/sunatCompany.model';
import { ContributorRegisterDTO } from '../dtos/companyRegister.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contractor-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contractor-registration.html',
})
export class ContractorRegistration {
  readonly currentYear = new Date().getFullYear();
  rucInput = '';
  sunatData: SunatContributorDTO | null = null;

  form: ContributorRegisterDTO = {
    contributorRuc: '',
    contributorName: '',
    address: '',
    contributorDistrict: null,
    contributorProvince: null,
    contributorDepartment: null,
    economicActivityDescription: '',
    emails: [''],
  };

  brochureFile: File | null = null;
  fichaRucFile: File | null = null;
  referencesListFile: File | null = null;

  constructor(
    private contractorService: ContractorService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  searchSunat() {
    if (this.rucInput.length !== 11) return;
    this.loaderService.show();
    this.sunatData = null;
    this.contractorService.getCompanyBySunat(this.rucInput).subscribe({
      next: (data) => {
        this.sunatData = data;
        this.form.contributorRuc = data.contributorRuc;
        this.form.contributorName = data.contributorName;
        this.form.address = data.contributorAddress;
        this.form.contributorDistrict   = data.contributorDistrict   ?? null;
        this.form.contributorProvince   = data.contributorProvince   ?? null;
        this.form.contributorDepartment = data.contributorDepartment ?? null;
        this.form.economicActivityDescription = data.contributorEconomicActivityDescription;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  onRucKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.searchSunat();
  }

  addEmail() {
    this.form.emails.push('');
  }

  removeEmail(index: number) {
    if (this.form.emails.length > 1) {
      this.form.emails.splice(index, 1);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  onFileChange(event: Event, field: 'brochureFile' | 'fichaRucFile' | 'referencesListFile'): void {
    const input = event.target as HTMLInputElement;
    this[field] = input.files?.[0] ?? null;
  }

  clearFile(field: 'brochureFile' | 'fichaRucFile' | 'referencesListFile', inputEl: HTMLInputElement): void {
    this[field] = null;
    inputEl.value = '';
  }

  submit() {
    this.loaderService.show();

    const formData = new FormData();
    formData.append('GraphAccessToken', localStorage.getItem('graph_access_token') ?? '');
    formData.append('ContributorRuc', this.form.contributorRuc);
    formData.append('ContributorName', this.form.contributorName);
    if (this.form.address) formData.append('ContributorAddress', this.form.address);
    if (this.form.contributorDistrict)   formData.append('ContributorDistrict',   this.form.contributorDistrict);
    if (this.form.contributorProvince)   formData.append('ContributorProvince',   this.form.contributorProvince);
    if (this.form.contributorDepartment) formData.append('ContributorDepartment', this.form.contributorDepartment);
    if (this.form.economicActivityDescription) formData.append('ContributorEconomicActivityDescription', this.form.economicActivityDescription);
    this.form.emails.forEach(email => formData.append('ContributorEmails', email));
    if (this.brochureFile) formData.append('BrochureFile', this.brochureFile, this.brochureFile.name);
    if (this.fichaRucFile) formData.append('FichaRucFile', this.fichaRucFile, this.fichaRucFile.name);
    if (this.referencesListFile) formData.append('ReferencesListFile', this.referencesListFile, this.referencesListFile.name);

    this.contractorService.register(formData).subscribe({
      next: (response) => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: '¡Solicitud enviada!',
          text: response.message ?? 'Tu solicitud fue recibida. Te contactaremos pronto.',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
