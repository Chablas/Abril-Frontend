import { Routes } from '@angular/router';

export const CHARLAS_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./charlas-dashboard.component').then((m) => m.CharlasDashboardComponent),
    data: { titulo: 'CHARLAS Y CAPACITACIONES', tab: 1 },
  },
  {
    path: 'capacitaciones',
    loadComponent: () => import('./charlas-dashboard.component').then((m) => m.CharlasDashboardComponent),
    data: { titulo: 'CHARLAS Y CAPACITACIONES', tab: 2 },
  },
  {
    path: 'nueva',
    loadComponent: () => import('./charlas-dashboard.component').then((m) => m.CharlasDashboardComponent),
    data: { titulo: 'CHARLAS Y CAPACITACIONES', tab: 3 },
  },
  {
    path: 'gestion',
    loadComponent: () => import('./charlas-dashboard.component').then((m) => m.CharlasDashboardComponent),
    data: { titulo: 'CHARLAS Y CAPACITACIONES', tab: 4 },
  },
];
