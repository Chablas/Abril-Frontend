import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Proyectos } from './features/proyectos/components/proyectos';
import { Area } from './features/area/components/area';
import { Companies } from './pages/companies/companies';
import { Workers } from './pages/workers/workers';
import { Feriados } from './features/feriados/components/feriados';
import { Aprendizaje } from './features/aprendizaje/components/aprendizaje';
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
        data: { titulo: 'PROYECTOS', featureKey: 'configuracion.proyectos' },
      },
      {
        path: 'area',
        component: Area,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - ÁREAS', featureKey: 'configuracion.area' },
      },
      {
        path: 'companies',
        component: Companies,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - RAZONES SOCIALES', featureKey: 'configuracion.companies' },
      },
      {
        path: 'workers',
        component: Workers,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - LISTA DE TRABAJADORES', featureKey: 'configuracion.workers' },
      },
      {
        path: 'feriados',
        component: Feriados,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - FERIADOS Y DÍAS NO LABORABLES', featureKey: 'configuracion.feriados' },
      },
      {
        path: 'aprendizaje',
        component: Aprendizaje,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - CENTRO DE APRENDIZAJE', featureKey: 'configuracion.aprendizaje' },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule],
  exports: [RouterModule],
})
export class ConfiguracionModule {}
