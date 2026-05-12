import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const GESTION_ADMINISTRATIVA_ROUTES: Routes = [
  { path: '', redirectTo: 'solicitud-salidas', pathMatch: 'full' },
  {
    path: 'solicitud-salidas',
    loadComponent: () =>
      import('./features/solicitud-salidas/components/solicitud-salidas').then(
        (m) => m.SolicitudSalidas,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'SOLICITUD DE SALIDAS',
      featureKey: 'gestion-administrativa.solicitud-salidas',
    },
  },
  {
    path: 'gestion-salidas',
    loadComponent: () =>
      import('./features/gestion-salidas/components/gestion-salidas').then(
        (m) => m.GestionSalidas,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'GESTIÓN DE SALIDAS',
      featureKey: 'gestion-administrativa.gestion-salidas',
    },
  },
  {
    path: 'configuracion/motivos',
    loadComponent: () =>
      import('./features/configuracion/motivos/pages/motivos').then(
        (m) => m.GaMotivos,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'MOTIVOS DE SALIDA',
      featureKey: 'gestion-administrativa.config.motivos',
    },
  },
  {
    path: 'configuracion/lugares',
    loadComponent: () =>
      import('./features/configuracion/lugares/pages/lugares').then(
        (m) => m.GaLugares,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'LUGARES DE ORIGEN / DESTINO',
      featureKey: 'gestion-administrativa.config.lugares',
    },
  },
];
