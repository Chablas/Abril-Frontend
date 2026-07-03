import { Routes } from '@angular/router';

export const PRESUPUESTO_MATERIALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/presupuesto-main/presupuesto-main').then((m) => m.PresupuestoMainComponent),
    data: { titulo: 'PRESUPUESTO MATERIALES · IMPORTACIÓN', roles: [] },
  },
  {
    path: 'drivers',
    loadComponent: () =>
      import('./pages/drivers/drivers-page').then((m) => m.DriversPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · DRIVERS', roles: [] },
  },
  {
    path: 'proyecto/:projectId',
    loadComponent: () =>
      import('./pages/proyecto/proyecto-page').then((m) => m.ProyectoPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · PROYECTO', roles: [] },
  },
  {
    path: 'presupuesto/:presupuestoId',
    loadComponent: () =>
      import('./pages/presupuesto-detalle/presupuesto-detalle').then((m) => m.PresupuestoDetallePage),
    data: { titulo: 'PRESUPUESTO MATERIALES · DETALLE', roles: [] },
  },
  {
    path: 'presupuesto/:presupuestoId/control',
    loadComponent: () =>
      import('./pages/control-semana/control-semana').then((m) => m.ControlSemanaPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · CONTROL SEMANAL', roles: [] },
  },
];

export default PRESUPUESTO_MATERIALES_ROUTES;
