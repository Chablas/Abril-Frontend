import { Routes } from '@angular/router';

export const PETAR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/lista/petar-lista').then((m) => m.PetarLista),
    data: { titulo: 'PETAR', roles: [] },
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/nuevo/petar-nuevo').then((m) => m.PetarNuevo),
    data: { titulo: 'NUEVO PETAR', roles: [] },
  },
];
