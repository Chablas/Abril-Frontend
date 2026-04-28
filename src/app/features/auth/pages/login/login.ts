import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { MicrosoftAuthService } from './services/microsoft-auth.service';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../../../core/services/loader.service';

type LoginTab = 'abril' | 'contratistas';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  token!: string;
  form!: FormGroup;
  contratistaForm!: FormGroup;

  activeTab: LoginTab = 'abril';
  showContratistaPassword = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService,
    private microsoftAuthService: MicrosoftAuthService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
    });
    this.contratistaForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  setTab(tab: LoginTab): void {
    this.activeTab = tab;
  }

  toggleContratistaPassword(): void {
    this.showContratistaPassword = !this.showContratistaPassword;
  }

  submit() {
    this.loaderService.show();
    this.cdr.detectChanges();
    if (this.form.invalid) return;

    const payload = { email: this.form.value.email, password: this.form.value.password };
    this.authService.login(payload).subscribe({
      next: () => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  submitContratista() {
    if (this.contratistaForm.invalid) return;
    this.loaderService.show();
    this.cdr.detectChanges();

    const { email, password } = this.contratistaForm.value;
    this.authService.loginContratista(email.trim(), password).subscribe({
      next: () => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.router.navigate(['/habilitacion/trabajadores']);
      },
      error: (err: HttpErrorResponse) => {
        this.handleContratistaError(err);
      },
    });
  }

  private handleContratistaError(err: HttpErrorResponse): void {
    this.loaderService.hide();
    this.cdr.detectChanges();

    const msg = (err.error?.message ?? '').toString();
    const noActivada = /no\s+(ha\s+)?(sido\s+)?activad[ao]/i.test(msg);

    if (noActivada) {
      Swal.fire({
        icon: 'warning',
        title: 'Cuenta no activada',
        text: 'Tu cuenta no está activada. Revisa tu correo o solicita un nuevo enlace.',
        showCancelButton: true,
        confirmButtonText: 'Reenviar activación',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#64bc04',
        cancelButtonColor: '#6b7280',
      }).then((res) => {
        if (res.isConfirmed) this.router.navigate(['/auth/recuperar-contratista']);
      });
      return;
    }

    this.error(err);
  }

  async submitMicrosoft() {
    this.loaderService.show();
    this.cdr.detectChanges();
    try {
      await this.microsoftAuthService.login();
      this.loaderService.hide();
      this.cdr.detectChanges();
      this.router.navigate(['/']);
    } catch (err: any) {
      this.loaderService.hide();
      this.cdr.detectChanges();
      // El usuario cerró el popup — no mostrar error
      if (['user_cancelled', 'popup_window_error', 'timed_out'].includes(err?.errorCode)) return;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message ?? 'No se pudo iniciar sesión con Microsoft.',
      });
    }
  }

  error(err: HttpErrorResponse) {
    this.loaderService.hide();
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: err.error?.message ?? 'Credenciales inválidas',
      });
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
