import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule  } from '@angular/forms';
import { AuthService } from "../../../../core/services/auth.service";
import { MicrosoftAuthService } from './services/microsoft-auth.service';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  token!: string;
  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService,
    private microsoftAuthService: MicrosoftAuthService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService
  ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
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
      }
    });
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
      Swal.fire({ icon: 'error', title: 'Error', text: err?.message ?? 'No se pudo iniciar sesión con Microsoft.' });
    }
  }

  error(err: HttpErrorResponse) {
    this.loaderService.hide();
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
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
