import { Routes } from '@angular/router';

export const INDICADORES_PROACTIVOS_ROUTES: Routes = [
  { path: '', redirectTo: 'programacion', pathMatch: 'full' },
  {
    path: 'programacion',
    loadComponent: () =>
      import('./pages/programacion/prog-inspeccion.component').then(
        (m) => m.ProgInspeccionComponent,
      ),
    data: { titulo: 'PROGRAMACIÓN DE INDICADORES' },
  },
  {
    path: 'seguimiento',
    loadComponent: () =>
      import('./pages/seguimiento/seguimiento-indicadores.component').then(
        (m) => m.SeguimientoIndicadoresComponent,
      ),
    data: { titulo: 'SEGUIMIENTO DE INDICADORES PROACTIVOS' },
  },
  {
    path: 'puntaje',
    loadComponent: () =>
      import('./pages/puntaje/puntaje-mes.component').then((m) => m.PuntajeMesComponent),
    data: { titulo: 'PUNTAJE DEL MES' },
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard-acumulado/dashboard-acumulado.component').then(
        (m) => m.DashboardAcumuladoComponent,
      ),
    data: { titulo: 'DASHBOARD ACUMULADO SSOMA' },
  },
  {
    path: 'dashboard-proyecto',
    loadComponent: () =>
      import('./pages/dashboard-proyecto/dashboard-proyecto.component').then(
        (m) => m.DashboardProyectoComponent,
      ),
    data: { titulo: 'DASHBOARD POR PROYECTO' },
  },
  {
    path: 'desempeno-supervisor',
    loadComponent: () =>
      import('./pages/desempeno-supervisor/desempeno-supervisor.component').then(
        (m) => m.DesempenoSupervisorComponent,
      ),
    data: { titulo: 'DESEMPEÑO DEL SUPERVISOR' },
  },
];

export default INDICADORES_PROACTIVOS_ROUTES;
