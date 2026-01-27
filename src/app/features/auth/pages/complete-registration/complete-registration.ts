import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RedirectCommand } from '@angular/router';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule  } from '@angular/forms';
import { AuthService } from "../../../../services/auth.service";
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-complete-registration',
  templateUrl: './complete-registration.html',
  imports: [ReactiveFormsModule]
})
export class CompleteRegistration implements OnInit {

  token!: string;

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  submit() {
    if (this.form.invalid) return;

    const password = this.form.value.password;
    const confirmPassword = this.form.value.confirmPassword;

    const payload = {
      token: this.token,
      password: password,
      confirmPassword: confirmPassword
    };
    this.authService.completeRegistration(payload).subscribe({
      next: () => {
        Swal.fire({
          title: 'Registro completado',
          text: 'Ya puedes iniciar sesión',
          icon: 'success',
          confirmButtonText: 'Ir al login'
        }).then(() => {
          this.router.navigate(['/auth/login']);
        });
      },
      error: (err) => {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
  }
}