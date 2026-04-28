import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import { EmpresaContratistaCreateDto } from '../../dtos/empresa.model';

@Component({
  selector: 'app-hab-registro-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registro-empresa.html',
  styleUrl: './registro-empresa.css',
})
export class RegistroEmpresa {
  model = this.empty();
  passwordConfirm = '';
  saving = false;

  constructor(
    private empresaService: EmpresaContratistaService,
    private router: Router,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  private empty() {
    return {
      ruc: '',
      razonSocial: '',
      nombreComercial: '',
      rubro: '',
      direccion: '',
      emailGerente: '',
      emailAdmin: '',
      emailSsoma: '',
      password: '',
    };
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (!this.model.razonSocial?.trim()) return false;
    if (!this.model.emailAdmin?.trim()) return false;
    if (!this.model.password || this.model.password.length < 6) return false;
    if (this.model.password !== this.passwordConfirm) return false;
    if (this.model.ruc && !/^\d{11}$/.test(this.model.ruc.trim())) return false;
    return true;
  }

  get passwordMismatch(): boolean {
    return !!this.passwordConfirm && this.model.password !== this.passwordConfirm;
  }

  get rucInvalido(): boolean {
    return !!this.model.ruc.trim() && !/^\d{11}$/.test(this.model.ruc.trim());
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Revisa los campos obligatorios y la contraseña.',
      });
      return;
    }

    const payload: EmpresaContratistaCreateDto = {
      razonSocial: this.model.razonSocial.trim(),
      nombreComercial: this.model.nombreComercial?.trim() || undefined,
      ruc: this.model.ruc?.trim() || undefined,
      rubro: this.model.rubro?.trim() || undefined,
      direccion: this.model.direccion?.trim() || undefined,
      password: this.model.password,
      emailGerente: this.model.emailGerente?.trim() || undefined,
      emailAdmin: this.model.emailAdmin.trim(),
      emailSsoma: this.model.emailSsoma?.trim() || undefined,
      tipo: 'CONTRATISTA',
      activo: false,
    };

    this.saving = true;
    this.loaderService.show();

    this.empresaService.createEmpresa(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Empresa registrada',
          text: 'Un administrador revisará tu cuenta. Te avisaremos cuando esté activa.',
          confirmButtonColor: '#64bc04',
        }).then(() => this.router.navigate(['/auth/login']));
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
