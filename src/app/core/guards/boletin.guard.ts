import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Protege `/boletin`: solo los trabajadores de Abril elegibles (correo `@abril.pe`
 * con rol `USUARIO DE ABRIL`) pueden verlo. Cualquier otro usuario se redirige al
 * inicio real (`/`, el panel de accesos).
 */
export const boletinGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  if (authService.esUsuarioAbrilBoletin()) return true;

  router.navigate(['/']);
  return false;
};
