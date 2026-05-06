import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const CLINICA_ROUTES: Routes = [
  { path: '', redirectTo: 'agenda', pathMatch: 'full' },
  {
    path: 'agenda',
    loadComponent: () => import('./pages/agenda/agenda').then(m => m.Agenda),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'CLÍNICA - AGENDA DEL DÍA', featureKey: 'clinica.agenda' },
  },
  {
    path: 'programaciones',
    loadComponent: () =>
      import('./pages/programaciones/programaciones').then(m => m.ProgramacionesClinica),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'CLÍNICA - PROGRAMACIONES', featureKey: 'clinica.programaciones' },
  },
];
