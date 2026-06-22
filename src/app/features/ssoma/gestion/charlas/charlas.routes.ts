import { Routes } from '@angular/router';

export const CHARLAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/charlas-dashboard').then((m) => m.CharlasDashboard),
    data: { titulo: 'CHARLAS Y CAPACITACIONES' },
  },
];
