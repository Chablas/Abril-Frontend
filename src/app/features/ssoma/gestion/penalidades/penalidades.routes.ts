import { Routes } from '@angular/router';
import { roleGuard } from '../../../../core/guards/role.guard';

export const PENALIDADES_ROUTES: Routes = [
  { path: '', redirectTo: 'lista', pathMatch: 'full' },
  {
    path: 'lista',
    loadComponent: () => import('./pages/lista/penalidades-lista').then((m) => m.PenalidadesLista),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.penalidades.lista' },
  },
  {
    path: 'catalogos',
    loadComponent: () => import('./pages/catalogos/penalidades-catalogos').then((m) => m.PenalidadesCatalogos),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.penalidades.catalogos' },
  },
];
