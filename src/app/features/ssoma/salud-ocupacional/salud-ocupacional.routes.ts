import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/guards/role.guard';
import { Dashboard } from './dashboard/dashboard';
import { Emos } from './emos/emos';
import { EmoHistorial } from './emos/components/emo-historial/emo-historial';
import { Programaciones } from './programaciones/programaciones';
import { Interconsultas } from './interconsultas/interconsultas';
import { Convalidaciones } from './convalidaciones/convalidaciones';
import { Catalogos } from './catalogos/catalogos';
import { Reportes } from './reportes/reportes';

export const SALUD_OCUPACIONAL_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - DASHBOARD', featureKey: 'ssoma.salud-ocupacional.dashboard' },
  },
  {
    path: 'emos',
    component: Emos,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - EMOs', featureKey: 'ssoma.salud-ocupacional.emos' },
  },
  {
    path: 'emos/:workerId/historial',
    component: EmoHistorial,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - HISTORIAL EMO', featureKey: 'ssoma.salud-ocupacional.emos' },
  },
  {
    path: 'programaciones',
    component: Programaciones,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - PROGRAMACIONES', featureKey: 'ssoma.salud-ocupacional.programaciones' },
  },
  {
    path: 'interconsultas',
    component: Interconsultas,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - INTERCONSULTAS', featureKey: 'ssoma.salud-ocupacional.interconsultas' },
  },
  {
    path: 'convalidaciones',
    component: Convalidaciones,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - CONVALIDACIONES', featureKey: 'ssoma.salud-ocupacional.convalidaciones' },
  },
  {
    path: 'catalogos',
    component: Catalogos,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - CATÁLOGOS', featureKey: 'ssoma.salud-ocupacional.catalogos' },
  },
  {
    path: 'reportes',
    component: Reportes,
    data: { titulo: 'SALUD OCUPACIONAL - REPORTES' },
  },
];
