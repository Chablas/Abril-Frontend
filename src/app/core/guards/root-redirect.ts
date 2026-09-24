import { RedirectFunction } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Redirección de la raíz `/` (solo `/` exacto, por `pathMatch: 'full'`):
 * - Con sesión válida → `/boletin` (portada Vive Abril).
 * - Sin sesión, o con token vencido y sin session token para renovarlo → `/auth/login`.
 *
 * Entrar directo a `/boletin` sin sesión sigue permitido: eso lo decide el
 * `boletinGuard` (portada pública), no esta redirección. Aquí solo cambiamos a
 * dónde cae quien llega a la raíz.
 */
export const rootRedirect: RedirectFunction = () => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // En SSR no hay localStorage; mantener la portada como landing por defecto.
  if (!isPlatformBrowser(platformId)) return '/boletin';

  // Un JWT vencido (vive 2 min) con session token sigue siendo una sesión: el interceptor lo
  // renueva en la primera petición del boletín. Mandarlo al login le pedía volver a entrar a
  // quien abría la intranet un rato después de haber iniciado sesión.
  const token = authService.getToken();
  const conSesion = !!token && (!authService.isTokenExpired() || !!authService.getSessionToken());
  return conSesion ? '/boletin' : '/auth/login';
};
