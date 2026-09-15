import { Routes } from '@angular/router';

export const ACTIVOS_ROTATIVOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista/activos-lista').then((m) => m.ActivosListaComponent),
    data: { titulo: 'ACTIVOS ROTATIVOS SSOMA', roles: [] },
  },
];

export default ACTIVOS_ROTATIVOS_ROUTES;
