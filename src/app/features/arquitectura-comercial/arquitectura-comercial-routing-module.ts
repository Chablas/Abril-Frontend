import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Dashboard } from './dashboard/dashboard';
import { Actividades } from './actividades/actividades';
import { Entregables } from './entregables/entregables';
import { Gantt } from './gantt/gantt';

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
          roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
        },
      },
      {
        path: 'actividades',
        component: Actividades,
        canActivate: [roleGuard],
        data: {
          titulo: 'ARQUITECTURA COMERCIAL - ACTIVIDADES',
          roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
        },
      },
      {
        path: 'entregables',
        component: Entregables,
        canActivate: [roleGuard],
        data: {
          titulo: 'ARQUITECTURA COMERCIAL - ENTREGABLES',
          roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
        },
      },
      {
        path: 'gantt',
        component: Gantt,
        canActivate: [roleGuard],
        data: {
          titulo: 'ARQUITECTURA COMERCIAL - GANTT',
          roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
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
