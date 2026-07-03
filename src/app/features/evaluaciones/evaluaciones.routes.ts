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
  {
    path: 'evaluar-contratista',
    loadComponent: () =>
      import('./pages/evaluar-contratista/evaluar-contratista').then(m => m.EvaluarContratista),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - EVALUAR CONTRATISTA', featureKey: 'evaluaciones.evaluar-contratista' },
  },
  {
    path: 'ver-contratistas',
    loadComponent: () =>
      import('./pages/ver-evaluacion-contratistas/ver-evaluacion-contratistas').then(
        m => m.VerEvaluacionContratistas,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - VER EVALUACIÓN CONTRATISTAS', featureKey: 'evaluaciones.ver-contratistas' },
  },
  {
    path: 'dashboard-contratistas',
    loadComponent: () =>
      import('./pages/dashboard-contratistas/dashboard-contratistas').then(
        m => m.DashboardContratistas,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - DASHBOARD CONTRATISTAS', featureKey: 'evaluaciones.dashboard-contratistas' },
  },
  { path: '', redirectTo: 'evaluar', pathMatch: 'full' },
];
