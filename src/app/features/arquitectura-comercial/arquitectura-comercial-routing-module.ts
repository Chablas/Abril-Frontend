import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Dashboard } from './dashboard/dashboard';
import { Actividades } from './actividades/actividades';
import { Entregables } from './entregables/entregables';
import { Gantt } from './gantt/gantt';
import { Plantilla } from './plantilla/plantilla';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [roleGuard],
        data: {
          titulo: 'ARQUITECTURA COMERCIAL - DASHBOARD',
          roles: ['USUARIO DE ARQUITECTURA COMERCIAL'],
        },
      },
      {
        path: 'actividades',
        component: Actividades,
        canActivate: [roleGuard],
        data: {
          titulo: 'ARQUITECTURA COMERCIAL - ACTIVIDADES',
          roles: ['USUARIO DE ARQUITECTURA COMERCIAL'],
        },
      },
      {
        path: 'entregables',
        component: Entregables,
        canActivate: [roleGuard],
        data: {
          titulo: 'ARQUITECTURA COMERCIAL - ENTREGABLES',
          roles: ['USUARIO DE ARQUITECTURA COMERCIAL'],
        },
      },
      {
        path: 'gantt',
        component: Gantt,
        canActivate: [roleGuard],
        data: {
          titulo: 'ARQUITECTURA COMERCIAL - GANTT',
          roles: ['USUARIO DE ARQUITECTURA COMERCIAL'],
        },
      },
      {
        path: 'plantilla',
        component: Plantilla,
        canActivate: [roleGuard],
        data: {
          titulo: 'ARQUITECTURA COMERCIAL - PLANTILLA',
          roles: ['USUARIO DE ARQUITECTURA COMERCIAL'],
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ArquitecturaComercialRoutingModule { }
