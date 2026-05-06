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
        data: { titulo: 'ARQUITECTURA COMERCIAL - DASHBOARD', featureKey: 'arquitectura-comercial.dashboard' },
      },
      {
        path: 'actividades',
        component: Actividades,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - ACTIVIDADES', featureKey: 'arquitectura-comercial.actividades' },
      },
      {
        path: 'entregables',
        component: Entregables,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - ENTREGABLES', featureKey: 'arquitectura-comercial.entregables' },
      },
      {
        path: 'gantt',
        component: Gantt,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - GANTT', featureKey: 'arquitectura-comercial.gantt' },
      },
      {
        path: 'plantilla',
        component: Plantilla,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - PLANTILLA', featureKey: 'arquitectura-comercial.plantilla' },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ArquitecturaComercialRoutingModule { }
