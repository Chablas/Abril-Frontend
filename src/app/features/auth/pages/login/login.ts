import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule  } from '@angular/forms';
import { AuthService } from "../../../../services/auth.service";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
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
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  submit() {
    if (this.form.invalid) return;

    const email = this.form.value.email;
    const password = this.form.value.password;

    const payload = {
      email: email,
      password: password
    };
    this.authService.login(payload).subscribe({
      next: () => {
        this.router.navigate(['/']);
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
