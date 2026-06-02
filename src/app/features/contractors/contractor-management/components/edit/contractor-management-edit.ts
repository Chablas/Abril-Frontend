import { Component, ChangeDetectorRef, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { ContractorManagementDTO } from '../../dtos/contractor-management.dto';
import { ContractorManagementService } from '../../services/contractor-management.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contractor-management-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './contractor-management-edit.html',
})
export class ContractorManagementEdit implements OnInit {
  @Input() item!: ContractorManagementDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('logoInput')        logoInput!:        ElementRef<HTMLInputElement>;
  @ViewChild('brochureInput')    brochureInput!:    ElementRef<HTMLInputElement>;
  @ViewChild('fichaRucInput')    fichaRucInput!:    ElementRef<HTMLInputElement>;
  @ViewChild('referencesInput')  referencesInput!:  ElementRef<HTMLInputElement>;

  // Campos de texto
  contributorName = '';
  contributorAddress = '';
  contributorEconomicActivityDescription = '';
  contributorDistrict = '';
  contributorProvince = '';
  contributorDepartment = '';
  legalEntityRegistryNumber = '';
  legalRepresentativeDni = '';
  legalRepresentativeFullName = '';

  // Correos
  emails: string[] = [];
  newEmail = '';

  // Archivos nuevos (null = no cambiar)
  logoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  brochureFile: File | null = null;
  fichaRucFile: File | null = null;
  referencesFile: File | null = null;

  constructor(
    private service: ContractorManagementService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.contributorName                        = this.item.contributorName ?? '';
    this.contributorAddress                     = this.item.contributorAddress ?? '';
    this.contributorEconomicActivityDescription = this.item.contributorEconomicActivityDescription ?? '';
    this.contributorDistrict                    = this.item.contributorDistrict ?? '';
    this.contributorProvince                    = this.item.contributorProvince ?? '';
    this.contributorDepartment                  = this.item.contributorDepartment ?? '';
    this.legalEntityRegistryNumber              = this.item.legalEntityRegistryNumber ?? '';
    this.legalRepresentativeDni                 = this.item.legalRepresentativeDni ?? '';
    this.legalRepresentativeFullName            = this.item.legalRepresentativeFullName ?? '';
    this.emails                                 = [...(this.item.emails ?? [])];
  }

  // ── Correos ────────────────────────────────────────────────────────────────

  addEmail(): void {
    // Se conserva tal cual se escribe (solo trim): los correos son sensibles a mayúsculas,
    // por lo que 'Correo@x.pe' y 'correo@x.pe' se consideran distintos.
    // El input tiene autocapitalize/autocorrect desactivados para que el navegador no
    // altere lo tecleado.
    const email = this.newEmail.trim();
    if (!email) return;
    if (this.emails.includes(email)) {   // duplicado exacto (case-sensitive)
      this.newEmail = '';
      return;
    }
    this.emails.push(email);
    this.newEmail = '';
  }

  removeEmail(index: number): void {
    this.emails.splice(index, 1);
  }

  // ── Archivos ────────────────────────────────────────────────────────────────

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.logoPreviewUrl = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.logoFile = null;
    this.logoPreviewUrl = null;
    this.logoInput.nativeElement.value = '';
  }

  onBrochureSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.brochureFile = file;
  }

  onFichaRucSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.fichaRucFile = file;
  }

  onReferencesSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.referencesFile = file;
  }

  clearBrochure(): void {
    this.brochureFile = null;
    this.brochureInput.nativeElement.value = '';
  }

  clearFichaRuc(): void {
    this.fichaRucFile = null;
    this.fichaRucInput.nativeElement.value = '';
  }

  clearReferences(): void {
    this.referencesFile = null;
    this.referencesInput.nativeElement.value = '';
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  save(): void {
    if (!this.contributorName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'La razón social es obligatoria.', confirmButtonColor: '#64BC04' });
      return;
    }

    const form = new FormData();
    form.append('contributorName',                        this.contributorName.trim());
    form.append('contributorAddress',                     this.contributorAddress.trim());
    form.append('contributorEconomicActivityDescription', this.contributorEconomicActivityDescription.trim());
    form.append('contributorDistrict',                    this.contributorDistrict.trim());
    form.append('contributorProvince',                    this.contributorProvince.trim());
    form.append('contributorDepartment',                  this.contributorDepartment.trim());
    form.append('legalEntityRegistryNumber',              this.legalEntityRegistryNumber.trim());
    form.append('legalRepresentativeDni',                 this.legalRepresentativeDni.trim());
    form.append('legalRepresentativeFullName',            this.legalRepresentativeFullName.trim());

    this.emails.forEach(e => form.append('emails', e));

    if (this.logoFile)       form.append('logoFile',           this.logoFile);
    if (this.brochureFile)   form.append('brochureFile',       this.brochureFile);
    if (this.fichaRucFile)   form.append('fichaRucFile',       this.fichaRucFile);
    if (this.referencesFile) form.append('referencesListFile', this.referencesFile);

    this.loaderService.show();
    this.service.update(this.item.contractorId, form).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Contratista actualizado exitosamente.', confirmButtonColor: '#64BC04', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
