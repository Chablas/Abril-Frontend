import { Routes } from '@angular/router';

export const CUMPLIMIENTO_SSOMA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cumplimiento-main/cumplimiento-main').then((m) => m.CumplimientoMainComponent),
    data: { titulo: 'CUMPLIMIENTO SSOMA', roles: [] },
  },
];

export default CUMPLIMIENTO_SSOMA_ROUTES;
