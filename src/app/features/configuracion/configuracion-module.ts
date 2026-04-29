import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Proyectos } from './features/proyectos/components/proyectos';
import { Companies } from './pages/companies/companies';
import { Workers } from './pages/workers/workers';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'proyectos', pathMatch: 'full' },
      {
        path: 'proyectos',
        component: Proyectos,
        canActivate: [roleGuard],
        data: { titulo: 'PROYECTOS', roles: ['ADMINISTRADOR DE UDP', 'USUARIO DE COSTOS Y PRESUPUESTOS'] },
      },
      {
        path: 'companies',
        component: Companies,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - RAZONES SOCIALES', roles: ['ADMINISTRADOR DEL SISTEMA', 'ADMINISTRADOR DE UDP'] },
      },
      {
        path: 'workers',
        component: Workers,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - LISTA DE TRABAJADORES', roles: ['ADMINISTRADOR DEL SISTEMA', 'ADMINISTRADOR DE UDP'] },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule],
  exports: [RouterModule],
})
export class ConfiguracionModule {}
