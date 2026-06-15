import { Routes } from '@angular/router';

export const OPT_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/opt-dashboard').then((m) => m.OptDashboard),
    data: { titulo: 'OPT — DASHBOARD' },
  },
  {
    path: 'lista',
    loadComponent: () => import('./pages/lista/opt-lista').then((m) => m.OptLista),
    data: { titulo: 'OPT — LISTA' },
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/nuevo/opt-nuevo').then((m) => m.OptNuevo),
    data: { titulo: 'NUEVA OPT' },
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/detalle/opt-detalle').then((m) => m.OptDetalle),
    data: { titulo: 'OPT — DETALLE' },
  },
];
