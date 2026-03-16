import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // Si estamos en el servidor (SSR)
  //comentar si se requiere ssr
  //esto de abajo soluciono  el problema de que no se podia actualizar
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  // hasta aca nomas

  const token = localStorage.getItem('access_token');

  if (!token) {
    return router.navigate(['/auth/login']);
  }

  if (authService.isTokenExpired()) {
    authService.logout();
    return router.navigate(['/auth/login']);
  }

  return true;
};