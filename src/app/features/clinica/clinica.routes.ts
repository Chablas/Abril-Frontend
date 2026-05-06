import { Routes } from '@angular/router';

export const CLINICA_ROUTES: Routes = [
  { path: '', redirectTo: 'agenda', pathMatch: 'full' },
  {
    path: 'agenda',
    loadComponent: () => import('./pages/agenda/agenda').then(m => m.Agenda),
    data: { titulo: 'CLÍNICA - AGENDA DEL DÍA' },
  },
  {
    path: 'programaciones',
    loadComponent: () =>
      import('./pages/programaciones/programaciones').then(m => m.ProgramacionesClinica),
    data: { titulo: 'CLÍNICA - PROGRAMACIONES' },
  },
];
