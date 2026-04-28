import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ContractorService } from '../services/contractor.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { SunatContributorDTO } from '../dtos/sunatCompany.model';
import { ReniecPersonDTO } from '../dtos/reniecPerson.model';
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

  // RUC search
  rucInput = '';
  sunatData: SunatContributorDTO | null = null;

  // DNI search
  dniInput = '';
  reniecData: ReniecPersonDTO | null = null;
  dniLookupLoading = false;

  form: ContributorRegisterDTO = {
    contributorRuc: '',
    contributorName: '',
    address: '',
    contributorDistrict: null,
    contributorProvince: null,
    contributorDepartment: null,
    economicActivityDescription: '',
    legalRepresentativeDni: null,
    legalRepresentativeFullName: null,
    legalEntityRegistryNumber: null,
    emails: [''],
  };

  brochureFile: File | null = null;
  fichaRucFile: File | null = null;
  referencesListFile: File | null = null;

  constructor(
    private contractorService: ContractorService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── RUC ──────────────────────────────────────────────────────────
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

  // ── DNI ──────────────────────────────────────────────────────────
  searchReniec() {
    if (this.dniInput.length !== 8) return;
    this.dniLookupLoading = true;
    this.contractorService.getPersonByDni(this.dniInput).subscribe({
      next: (data) => {
        this.reniecData = data;
        this.form.legalRepresentativeDni = data.document_number;
        this.form.legalRepresentativeFullName = `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim();
        this.dniLookupLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.dniLookupLoading = false;
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'DNI no encontrado', text: 'No se encontró información para el DNI ingresado.' });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  onDniKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.searchReniec();
  }

  clearReniec() {
    this.reniecData = null;
    this.dniInput = '';
    this.form.legalRepresentativeDni = null;
    this.form.legalRepresentativeFullName = null;
  }

  // ── Emails ───────────────────────────────────────────────────────
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

  // ── Files ────────────────────────────────────────────────────────
  onFileChange(event: Event, field: 'brochureFile' | 'fichaRucFile' | 'referencesListFile'): void {
    const input = event.target as HTMLInputElement;
    this[field] = input.files?.[0] ?? null;
  }

  clearFile(field: 'brochureFile' | 'fichaRucFile' | 'referencesListFile', inputEl: HTMLInputElement): void {
    this[field] = null;
    inputEl.value = '';
  }

  // ── Submit ───────────────────────────────────────────────────────
  submit() {
    this.loaderService.show();

    const formData = new FormData();
    formData.append('GraphAccessToken', localStorage.getItem('graph_access_token') ?? '');
    formData.append('ContributorRuc', this.form.contributorRuc);
    formData.append('ContributorName', this.form.contributorName);
    if (this.form.address)                       formData.append('ContributorAddress', this.form.address);
    if (this.form.contributorDistrict)           formData.append('ContributorDistrict', this.form.contributorDistrict);
    if (this.form.contributorProvince)           formData.append('ContributorProvince', this.form.contributorProvince);
    if (this.form.contributorDepartment)         formData.append('ContributorDepartment', this.form.contributorDepartment);
    if (this.form.economicActivityDescription)   formData.append('ContributorEconomicActivityDescription', this.form.economicActivityDescription);
    if (this.form.legalRepresentativeDni)        formData.append('LegalRepresentativeDni', this.form.legalRepresentativeDni);
    if (this.form.legalRepresentativeFullName)   formData.append('LegalRepresentativeFullName', this.form.legalRepresentativeFullName);
    if (this.form.legalEntityRegistryNumber)     formData.append('LegalEntityRegistryNumber', this.form.legalEntityRegistryNumber);
    this.form.emails.forEach(email => formData.append('ContributorEmails', email));
    if (this.brochureFile)      formData.append('BrochureFile', this.brochureFile, this.brochureFile.name);
    if (this.fichaRucFile)      formData.append('FichaRucFile', this.fichaRucFile, this.fichaRucFile.name);
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
