import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { ContractorManagementDTO } from '../../dtos/contractor-management.dto';
import { ContractorManagementService } from '../../services/contractor-management.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ContractorManagementEdit } from '../edit/contractor-management-edit';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contractor-management-detail',
  standalone: true,
  imports: [CommonModule, BaseModal, ContractorManagementEdit],
  templateUrl: './contractor-management-detail.html',
})
export class ContractorManagementDetail {
  @Input() item!: ContractorManagementDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() actionCompleted = new EventEmitter<void>();

  activeTab: 'general' | 'users' = 'general';
  showEditModal = false;

  constructor(
    private service: ContractorManagementService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  approve(): void {
    this.loaderService.show();
    this.service.approve(this.item.contractorId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Aprobado', text: res.message ?? 'El contratista fue aprobado correctamente.' });
        this.actionCompleted.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  reject(): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Rechazar solicitud?',
      text: 'Esta acción marcará al contratista como rechazado.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.reject(this.item.contractorId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Rechazado', text: res.message ?? 'El contratista fue rechazado.' });
          this.actionCompleted.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
        },
      });
    });
  }

  openEdit(): void {
    this.showEditModal = true;
  }

  onEditSaved(): void {
    this.showEditModal = false;
    this.actionCompleted.emit();
    this.closeModal.emit();
  }

  sendCredentials(): void {
    const alreadyHasUser = !!this.item.hasUser;
    const text = alreadyHasUser
      ? `${this.item.contributorName} ya tiene credenciales registradas. ¿Deseas enviar un nuevo enlace de activación de todas formas?`
      : `Se enviará un enlace de activación a los correos registrados de ${this.item.contributorName}.`;

    Swal.fire({
      icon: 'question',
      title: 'Enviar credenciales',
      text,
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.sendCredentials(this.item.contractorId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Enviado',
            text: res.message ?? 'El enlace de activación fue enviado exitosamente.',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
