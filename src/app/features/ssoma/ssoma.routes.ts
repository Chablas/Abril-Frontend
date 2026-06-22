import { Routes } from '@angular/router';

export const SSOMA_ROUTES: Routes = [
  {
    path: 'salud-ocupacional',
    loadChildren: () =>
      import('./salud-ocupacional/salud-ocupacional.routes').then(
        (m) => m.SALUD_OCUPACIONAL_ROUTES,
      ),
  },
  {
    path: 'gestion/paso',
    loadChildren: () =>
      import('./salud-ocupacional/paso/paso.routes').then((m) => m.PASO_ROUTES),
  },
  {
    path: 'gestion/rac',
    loadChildren: () =>
      import('./gestion/rac/rac.routes').then((m) => m.RAC_ROUTES),
  },
  {
    path: 'gestion/opt',
    loadChildren: () =>
      import('./gestion/opt/opt.routes').then((m) => m.OPT_ROUTES),
  },
  {
    path: 'gestion/inspeccion',
    loadChildren: () =>
      import('./gestion/inspeccion/inspeccion.routes').then((m) => m.INSPECCION_ROUTES),
  },
  {
    path: 'gestion/charlas',
    loadChildren: () =>
      import('./gestion/charlas/charlas.routes').then((m) => m.CHARLAS_ROUTES),
  },
  { path: '', redirectTo: 'salud-ocupacional', pathMatch: 'full' },
];
