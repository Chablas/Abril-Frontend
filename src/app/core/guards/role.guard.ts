import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  const featureKey    = route.data?.['featureKey']    as string | undefined;
  const allowedRoles  = route.data?.['roles']         as string[] | undefined;
  const tiposBloqueados = route.data?.['blockedTipos'] as string[] | undefined;

  // Exclusión dura por tipo de sesión (independiente del featureKey/roles de abajo).
  // Se usa en rutas donde un tipo de sesión específico NUNCA debe entrar aunque
  // arrastre un featureKey mal asignado (p. ej. un CONTRATISTA con "clinica.agenda"
  // colado desde un user_role interno no debe poder entrar al portal de clínica).
  if (tiposBloqueados?.length) {
    if (tiposBloqueados.includes('CONTRATISTA') && authService.isContratista()) {
      router.navigate(['/']);
      return false;
    }
    if (tiposBloqueados.includes('CLINICA') && authService.isClinica()) {
      router.navigate(['/']);
      return false;
    }
  }

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
    // Contratistas usan sistema de auth propio (tipo en localStorage, no claim JWT)
    if (allowedRoles.includes('CONTRATISTA') && authService.isContratista()) return true;
    if (allowedRoles.includes('CLINICA') && authService.isClinica()) return true;
  }

  router.navigate(['/']);
  return false;
};
