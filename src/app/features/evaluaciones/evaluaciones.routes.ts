import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const EVALUACIONES_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard-gerencia/dashboard-gerencia').then(m => m.DashboardGerencia),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - DASHBOARD', featureKey: 'evaluaciones.dashboard' },
  },
  {
    path: 'evaluar',
    loadComponent: () =>
      import('./pages/evaluar-residente/evaluar-residente').then(m => m.EvaluarResidente),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - EVALUAR RESIDENTE', featureKey: 'evaluaciones.evaluar' },
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./pages/historial/historial').then(m => m.Historial),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - HISTORIAL', featureKey: 'evaluaciones.historial' },
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./pages/configuracion-plantilla/configuracion-plantilla').then(
        m => m.ConfiguracionPlantilla,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - CONFIGURACIÓN', featureKey: 'evaluaciones.configuracion' },
  },
  {
    path: 'asignaciones',
    loadComponent: () =>
      import('./asignaciones/asignaciones').then(m => m.Asignaciones),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - ASIGNACIONES', featureKey: 'evaluaciones.asignaciones' },
  },
  { path: '', redirectTo: 'evaluar', pathMatch: 'full' },
];
