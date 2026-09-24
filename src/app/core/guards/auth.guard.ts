import { CanActivateFn } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ReturnUrlService } from '../auth/return-url.service';

export const authGuard: CanActivateFn = (_route, state) => {

  const authService = inject(AuthService);
  const returnUrlService = inject(ReturnUrlService);
  const platformId = inject(PLATFORM_ID);

  // Si estamos en el servidor (SSR)
  //comentar si se requiere ssr
  //esto de abajo soluciono  el problema de que no se podia actualizar
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  // hasta aca nomas

  const token = localStorage.getItem('access_token');

  // Sin sesión (o vencida) se va al login PERO llevando a dónde iba: al entrar,
  // el login lo devuelve a esa URL en vez de al landing por defecto. Es lo que
  // hace que los enlaces profundos de los correos (p. ej. el de aprobación de
  // Gerencia) sigan llegando a su destino.
  if (!token) {
    return returnUrlService.loginRedirect(state.url);
  }

  if (!authService.isTokenExpired()) {
    return true;
  }

  // Contratistas y clínica no tienen session token: su JWT no se renueva, vencido es vencido.
  if (!authService.getSessionToken()) {
    authService.logout();
    return returnUrlService.loginRedirect(state.url);
  }

  // El JWT vive 2 minutos: que esté vencido NO quiere decir que la sesión terminó. La sesión
  // es el session token (24 h), y se renueva acá antes de decidir. Antes se cerraba la sesión
  // sin intentarlo, y como el refresco periódico solo corre con la intranet abierta, toda
  // entrada en frío (el enlace de un correo, una pestaña nueva, volver de la suspensión)
  // mandaba al login a gente que había entrado hacía minutos — y de paso, como localStorage
  // es compartido, dejaba sin sesión a las demás pestañas abiertas.
  return authService.refresh().pipe(
    map(() => true),
    catchError((err: HttpErrorResponse) => {
      // El backend miró el session token y lo rechazó (vencido o revocado): ahora sí, al login.
      if (err.status >= 400 && err.status < 500) {
        authService.logout();
        return of(returnUrlService.loginRedirect(state.url));
      }
      // Sin red o backend reiniciándose (un deploy): eso no dice nada de la sesión. Se deja
      // pasar y el interceptor renueva el token en la primera petición de la página.
      return of(true);
    }),
  );
};
