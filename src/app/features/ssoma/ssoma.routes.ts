import { Routes } from '@angular/router';

export const SSOMA_ROUTES: Routes = [
  {
    path: 'salud-ocupacional',
    loadChildren: () =>
      import('./salud-ocupacional/salud-ocupacional.routes').then(
        (m) => m.SALUD_OCUPACIONAL_ROUTES,
      ),
  },
  { path: '', redirectTo: 'salud-ocupacional', pathMatch: 'full' },
];
