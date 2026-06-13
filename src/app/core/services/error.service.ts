import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { LoaderService } from './loader.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  constructor(
    private router: Router,
    private loaderService: LoaderService
  ) {}

  handleError(err: HttpErrorResponse) {

    this.loaderService.hide();

    if (err.status === 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });

      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('allowed_features');
      localStorage.removeItem('contratista_scope');
      localStorage.removeItem('contratista_proyectos');
      localStorage.removeItem('session_token');
      this.router.navigate(['/auth/login']);
      return;
    }

    // 422 — falta configuración (p. ej. correos de staff no asociados al proyecto).
    // Se muestra como advertencia para que el usuario no lo confunda con un error del sistema.
    if (err.status === 422) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta configuración',
        text: err.error?.message ?? 'Falta completar una configuración para continuar.',
        confirmButtonColor: '#64BC04',
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
    }
  }
}