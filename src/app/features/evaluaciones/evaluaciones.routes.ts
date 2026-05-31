import { Routes } from '@angular/router';

export const EVALUACIONES_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard-gerencia/dashboard-gerencia').then(m => m.DashboardGerencia),
    data: { titulo: 'EVALUACIONES - DASHBOARD', featureKey: 'evaluaciones.dashboard' },
  },
  {
    path: 'evaluar',
    loadComponent: () =>
      import('./pages/evaluar-residente/evaluar-residente').then(m => m.EvaluarResidente),
    data: { titulo: 'EVALUACIONES - EVALUAR RESIDENTE', featureKey: 'evaluaciones.evaluar' },
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./pages/historial/historial').then(m => m.Historial),
    data: { titulo: 'EVALUACIONES - HISTORIAL', featureKey: 'evaluaciones.historial' },
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./pages/configuracion-plantilla/configuracion-plantilla').then(
        m => m.ConfiguracionPlantilla,
      ),
    data: { titulo: 'EVALUACIONES - CONFIGURACIÓN', featureKey: 'evaluaciones.configuracion' },
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
