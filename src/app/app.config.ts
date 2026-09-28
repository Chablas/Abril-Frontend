import { ApplicationConfig, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { provideRouter, withRouterConfig, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Sin withFetch(): con fetch, algunas respuestas HTTP no disparaban detección de
    // cambios (había que hacer un clic extra para que la UI se refrescara) incluso con
    // el parche de zone.js para fetch cargado — el backend XHR de siempre no tiene ese problema.
    provideHttpClient(withInterceptors([authInterceptor])),

    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload',
      }),
      withPreloading(PreloadAllModules),
    ),

    //descomentar si se requiere ssr
    //provideClientHydration(withEventReplay()),

    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-PE' }
  ],
};