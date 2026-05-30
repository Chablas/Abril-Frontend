import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { MicrosoftAuthService } from './services/microsoft-auth.service';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../../../core/services/loader.service';

type LoginTab = 'abril' | 'contratistas' | 'clinica';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  readonly tutorialVideos = [
    { titulo: 'Activación de cuentas para contratistas', url: 'https://www.loom.com/share/aac2201e68a54a7bb5fb15deeb91f174' },
    { titulo: 'Gestión de trabajadores, bajas y reingresos', url: 'https://www.loom.com/share/a9993b1550f7411f8895988900decccf' },
    { titulo: 'Gestión de empresas', url: 'https://www.loom.com/share/d9a285cd5c0f4466988ebecc089f6b4c' },
    { titulo: 'Activar nuevos proyectos', url: 'https://www.loom.com/share/e3f1e631086d41bca2ce8290b122e04d' },
    { titulo: 'Ingreso de nuevos equipos y máquinas', url: 'https://www.loom.com/share/7a48bd8a143a4f90816aa98efbf1f05a' },
    { titulo: 'Subir póliza SCTR y Vida Ley', url: 'https://www.loom.com/share/3513c6a50d2c4c86b92de2c26d780348' },
    { titulo: 'Programar inducción y validar asistencia', url: 'https://www.loom.com/share/68e3ae6cccb147c988d2056accad707c' },
  ];

  token!: string;
  form!: FormGroup;
  contratistaForm!: FormGroup;

  activeTab: LoginTab = 'abril';
  showContratistaPassword = false;
  clinicaForm = { email: '', password: '' };
  clinicaLoading = false;
  clinicaError = '';

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

  submitClinica(): void {
    this.clinicaLoading = true;
    this.clinicaError = '';
    this.authService.loginClinica(this.clinicaForm.email, this.clinicaForm.password).subscribe({
      next: (data) => {
        this.authService.persistClinicaToken(data);
        this.router.navigate(['/clinica/agenda']);
      },
      error: () => {
        this.clinicaLoading = false;
        this.clinicaError = 'Credenciales inválidas.';
      },
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
        this.router.navigate(['/habilitacion']);
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
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
