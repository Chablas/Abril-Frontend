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

  // Si la ruta exige roles/tipo de sesión explícitos, esto manda sobre el feature key:
  // evita que un CONTRATISTA con un featureKey mal asignado (p. ej. "clinica.agenda"
  // colado desde un user_role interno) entre a un portal que no le corresponde.
  if (allowedRoles?.length) {
    const userRoles = authService.getRoles();
    const cumpleRol =
      allowedRoles.some((r) => userRoles.includes(r)) ||
      (allowedRoles.includes('CONTRATISTA') && authService.isContratista()) ||
      (allowedRoles.includes('CLINICA') && authService.isClinica());
    if (cumpleRol) return true;
    router.navigate(['/']);
    return false;
  }

  // Verificación por feature key (sistema dinámico desde BD)
  if (featureKey) {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('allowed_features') : null;
    const allowedFeatures: string[] = raw ? JSON.parse(raw) : [];
    if (allowedFeatures.includes(featureKey)) return true;
  }

  router.navigate(['/']);
  return false;
};
