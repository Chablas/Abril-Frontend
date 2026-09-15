import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const ALMACEN_ROUTES: Routes = [
  { path: '', redirectTo: 'stock', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/almacen-dashboard').then((m) => m.AlmacenDashboard),
    canActivate: [roleGuard],
    data: { titulo: 'ALMACÉN - DASHBOARD LOGÍSTICO', featureKey: 'almacen.materiales' },
  },
  {
    path: 'stock',
    loadComponent: () => import('./pages/stock/almacen-stock').then((m) => m.AlmacenStock),
    canActivate: [roleGuard],
    data: { titulo: 'ALMACÉN - STOCK Y MOVIMIENTOS', featureKey: 'almacen.materiales' },
  },
  {
    path: 'ordenes-compra',
    loadComponent: () => import('./pages/ordenes-compra/almacen-ordenes-compra').then((m) => m.AlmacenOrdenesCompra),
    canActivate: [roleGuard],
    data: { titulo: 'ALMACÉN - ÓRDENES DE COMPRA Y CONTRATOS', featureKey: 'almacen.ordenes-compra' },
  },
];
