import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const GESTION_GTH_ROUTES: Routes = [
  { path: '', redirectTo: 'reclutamiento', pathMatch: 'full' },
  {
    path: 'reclutamiento',
    loadComponent: () =>
      import('./reclutamiento/reclutamiento').then((m) => m.GthReclutamiento),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'RECLUTAMIENTO',
      featureKey: 'gestion-gth.reclutamiento',
    },
  },
];
