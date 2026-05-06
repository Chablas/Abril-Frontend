import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  const featureKey   = route.data?.['featureKey'] as string | undefined;
  const allowedRoles = route.data?.['roles']      as string[] | undefined;

  // Verificación por feature key (sistema dinámico desde BD)
  if (featureKey) {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('allowed_features') : null;
    const allowedFeatures: string[] = raw ? JSON.parse(raw) : [];
    if (allowedFeatures.includes(featureKey)) return true;
  }

  // Fallback por rol JWT (rutas de CONTRATISTA u otros roles especiales)
  if (allowedRoles?.length) {
    const userRoles = authService.getRoles();
    if (allowedRoles.some((r) => userRoles.includes(r))) return true;
  }

  router.navigate(['/']);
  return false;
};
