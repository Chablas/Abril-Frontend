import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ContractorService } from '../services/contractor.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { SunatCompanyDTO } from '../dtos/sunatCompany.model';
import { CompanyRegisterDTO } from '../dtos/companyRegister.model';
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
  sunatData: SunatCompanyDTO | null = null;

  form: CompanyRegisterDTO = {
    companyRuc: '',
    companyName: '',
    address: '',
    economicActivityDescription: '',
    emails: [''],
  };

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
        this.form.companyRuc = data.numero_documento;
        this.form.companyName = data.razon_social;
        this.form.address = data.direccion;
        this.form.economicActivityDescription = data.actividad_economica;
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

  submit() {
    this.loaderService.show();
    this.contractorService.register(this.form).subscribe({
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
