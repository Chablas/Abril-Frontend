import { Routes } from '@angular/router';
import { Companies } from './pages/companies/companies';
import { Projects } from './pages/projects/projects';
import { Workers } from './pages/workers/workers';

export const CONFIGURACION_ROUTES: Routes = [
  { path: '', redirectTo: 'companies', pathMatch: 'full' },
  {
    path: 'companies',
    component: Companies,
    data: { titulo: 'CONFIGURACIÓN - RAZONES SOCIALES' },
  },
  {
    path: 'projects',
    component: Projects,
    data: { titulo: 'CONFIGURACIÓN - PROYECTOS' },
  },
  {
    path: 'workers',
    component: Workers,
    data: { titulo: 'CONFIGURACIÓN - LISTA DE TRABAJADORES' },
  },
];
