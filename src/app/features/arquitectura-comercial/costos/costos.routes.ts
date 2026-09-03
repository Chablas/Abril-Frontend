import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/guards/role.guard';

export const COSTOS_ROUTES: Routes = [
  { path: '', redirectTo: 'registro', pathMatch: 'full' },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/costos-registro').then((m) => m.CostosRegistro),
    canActivate: [roleGuard],
    data: { titulo: 'ARQUITECTURA COMERCIAL - COSTOS - REGISTRO', featureKey: 'arquitectura-comercial.costos' },
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/costos-dashboard').then((m) => m.CostosDashboard),
    canActivate: [roleGuard],
    data: { titulo: 'ARQUITECTURA COMERCIAL - COSTOS - DASHBOARD', featureKey: 'arquitectura-comercial.costos' },
  },
];
