import { Routes } from '@angular/router';

export const HOJA_RUTA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/resumen/hoja-ruta-resumen').then((m) => m.HojaRutaResumen),
    data: { titulo: 'HOJA DE RUTA DE CONTRATISTAS', roles: [] },
  },
];

export default HOJA_RUTA_ROUTES;
