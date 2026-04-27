import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ProyectoService } from '../../services/proyecto.service';
import { ProjectCreateDto } from '../../dtos/project-create.dto';
import { ContributorLookupDto } from '../../dtos/company-lookup.dto';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';

interface ProjectFormModel {
  projectDescription: string;
  levelDescription: string;
  rucInput: string;
  contributor: ContributorLookupDto | null;
  projectDistrict: string;
  projectProvince: string;
  projectDepartment: string;
  projectLocation: string;
  active: boolean;
}

@Component({
  selector: 'app-proyecto-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './proyecto-create.html',
})
export class ProyectoCreate {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form: ProjectFormModel = this.emptyForm();
  rucLookupLoading = false;
  saving = false;

  constructor(
    private proyectoService: ProyectoService,
    private router: Router,
  ) {}

  lookupRuc(): void {
    const ruc = this.form.rucInput.trim();
    if (!/^\d{11}$/.test(ruc)) {
      Swal.fire({ icon: 'warning', title: 'RUC inválido', text: 'El RUC debe tener 11 dígitos.' });
      return;
    }
    this.rucLookupLoading = true;
    this.proyectoService.getCompanyByRuc(ruc).subscribe({
      next: (contributor) => {
        this.form.contributor = contributor;
        this.form.rucInput = contributor.contributorRuc;
        this.rucLookupLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.rucLookupLoading = false;
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'RUC no encontrado', text: 'No se encontró información para el RUC ingresado.' });
          return;
        }
        this.handleError(err);
      },
    });
  }

  clearContributor(): void {
    this.form.contributor = null;
    this.form.rucInput = '';
  }

  save(): void {
    if (!this.form.projectDescription.trim() || this.saving) return;
    this.saving = true;

    const dto: ProjectCreateDto = {
      projectDescription: this.form.projectDescription.trim(),
      levelDescription: this.form.levelDescription.trim() || undefined,
      contributorId: this.form.contributor?.contributorId,
      projectDistrict: this.form.projectDistrict.trim() || undefined,
      projectProvince: this.form.projectProvince.trim() || undefined,
      projectDepartment: this.form.projectDepartment.trim() || undefined,
      projectLocation: this.form.projectLocation.trim() || undefined,
      active: this.form.active,
    };

    this.proyectoService.create(dto).subscribe({
      next: (response) => {
        this.saving = false;
        Swal.fire({ title: response.message ?? 'Proyecto creado exitosamente', icon: 'success', draggable: true });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.handleError(err);
      },
    });
  }

  private emptyForm(): ProjectFormModel {
    return {
      projectDescription: '',
      levelDescription: '',
      rucInput: '',
      contributor: null,
      projectDistrict: '',
      projectProvince: '',
      projectDepartment: '',
      projectLocation: '',
      active: true,
    };
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 401) {
      Swal.fire({ icon: 'error', title: 'Sesión expirada', text: err.error?.message ?? '' });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }
    if (err.status >= 400 && err.status < 500) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message ?? 'Ocurrió un error.' });
      return;
    }
    Swal.fire({ icon: 'error', title: 'Error del servidor', text: err.error?.message ?? 'Ocurrió un error.' });
  }
}
