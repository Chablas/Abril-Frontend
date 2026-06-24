import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Roles } from '../../core/constants/roles';

export const CONTABILIDAD_ROUTES: Routes = [
  { path: '', redirectTo: 'facturas', pathMatch: 'full' },
  {
    path: 'facturas',
    loadComponent: () =>
      import('./features/facturas/components/facturas').then((m) => m.Facturas),
    canActivate: [roleGuard],
    data: {
      titulo: 'FACTURAS',
      featureKey: 'accounting.invoices',
      roles: [Roles.CONTABILIDAD_USUARIO, Roles.ADMINISTRADOR_SISTEMA],
    },
  },
];
