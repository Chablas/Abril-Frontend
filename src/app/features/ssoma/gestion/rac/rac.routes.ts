import { Routes } from '@angular/router';

export const RAC_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/rac-dashboard').then((m) => m.RacDashboard),
  },
  {
    path: 'lista',
    loadComponent: () => import('./pages/lista/rac-lista').then((m) => m.RacLista),
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/nuevo/rac-nuevo').then((m) => m.RacNuevo),
  },
  {
    path: 'penalidades',
    loadComponent: () =>
      import('./pages/penalidades/rac-penalidades').then((m) => m.RacPenalidades),
  },
  {
    path: ':id/cerrar',
    loadComponent: () => import('./pages/cerrar/rac-cerrar').then((m) => m.RacCerrar),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/detalle/rac-detalle').then((m) => m.RacDetalle),
  },
];
