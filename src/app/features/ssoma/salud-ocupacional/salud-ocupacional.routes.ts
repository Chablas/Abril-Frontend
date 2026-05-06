import { Routes } from '@angular/router';
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
    data: { titulo: 'SALUD OCUPACIONAL - DASHBOARD' },
  },
  {
    path: 'emos',
    component: Emos,
    data: { titulo: 'SALUD OCUPACIONAL - EMOs' },
  },
  {
    path: 'emos/:workerId/historial',
    component: EmoHistorial,
    data: { titulo: 'SALUD OCUPACIONAL - HISTORIAL EMO' },
  },
  {
    path: 'programaciones',
    component: Programaciones,
    data: { titulo: 'SALUD OCUPACIONAL - PROGRAMACIONES' },
  },
  {
    path: 'interconsultas',
    component: Interconsultas,
    data: { titulo: 'SALUD OCUPACIONAL - INTERCONSULTAS' },
  },
  {
    path: 'convalidaciones',
    component: Convalidaciones,
    data: { titulo: 'SALUD OCUPACIONAL - CONVALIDACIONES' },
  },
  {
    path: 'catalogos',
    component: Catalogos,
    data: { titulo: 'SALUD OCUPACIONAL - CATÁLOGOS' },
  },
  {
    path: 'reportes',
    component: Reportes,
    data: { titulo: 'SALUD OCUPACIONAL - REPORTES' },
  },
];
