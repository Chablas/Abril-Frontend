import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const PROPIETARIOS_ROUTES: Routes = [
  {
    path: 'gestion',
    loadComponent: () =>
      import('./features/gestion-propietarios/components/gestion-propietarios/gestion-propietarios').then(
        (m) => m.GestionPropietarios,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'PROPIETARIOS', featureKey: 'propietarios.gestion' },
  },
  { path: '', redirectTo: 'gestion', pathMatch: 'full' },
];
