import { Routes } from '@angular/router';

export const EPP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/lista/epp-lista').then((m) => m.EppListaComponent),
    data: { titulo: 'CATÁLOGO DE EPP', roles: [] },
  },
];

export default EPP_ROUTES;
