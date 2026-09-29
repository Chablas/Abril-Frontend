import { Routes } from '@angular/router';

export const ATS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/lista/ats-lista').then((m) => m.AtsLista),
    data: { titulo: 'ATS DIGITAL', roles: [] },
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/nuevo/ats-nuevo').then((m) => m.AtsNuevo),
    data: { titulo: 'NUEVO ATS', roles: [] },
  },
  {
    path: 'plantillas',
    loadComponent: () => import('./pages/plantillas/ats-plantillas').then((m) => m.AtsPlantillas),
    data: { titulo: 'PLANTILLAS DE ATS', roles: [] },
  },
  {
    path: 'plantillas/detalle/:id',
    loadComponent: () => import('./pages/plantilla-detalle/ats-plantilla-detalle').then((m) => m.AtsPlantillaDetalle),
    data: { titulo: 'PLANTILLA DE ATS', roles: [] },
  },
  {
    path: 'plantillas/:tab',
    loadComponent: () => import('./pages/plantillas/ats-plantillas').then((m) => m.AtsPlantillas),
    data: { titulo: 'PLANTILLAS DE ATS', roles: [] },
  },
];
