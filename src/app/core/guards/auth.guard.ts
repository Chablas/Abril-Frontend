import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const token = localStorage.getItem('access_token');

  // Si no hay token → login
  if (!token) {
    router.navigate(['/auth/login']);
    return false;
  }

  // Si está vencido → logout + login
  if (authService.isTokenExpired()) {
    authService.logout(); // opcional pero recomendado
    router.navigate(['/auth/login']);
    return false;
  }

  return true;
};