import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Proyectos } from './features/proyectos/components/proyectos';
import { Area } from './features/area/components/area';
import { Companies } from './pages/companies/companies';
import { Workers } from './pages/workers/workers';
import { Feriados } from './features/feriados/components/feriados';
import { Aprendizaje } from './features/aprendizaje/components/aprendizaje';
// Revisores de trabajadores/áreas: definen los jefes de cada trabajador y de cada
// área, por lo que son configuración global (antes vivían bajo Gestión
// Administrativa, solo para salidas). Los archivos siguen físicamente en
// `gestion-administrativa/features/configuracion/` hasta que se refactoricen.
import { RevisorSalidas } from '../gestion-administrativa/features/configuracion/revisor-salidas/pages/revisor-salidas';
import { RevisoresAreas } from '../gestion-administrativa/features/configuracion/revisores-areas/pages/revisores-areas';
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
        path: 'revisor-salidas',
        component: RevisorSalidas,
        canActivate: [roleGuard],
        data: {
          titulo: 'CONFIGURACIÓN - REVISORES DE TRABAJADORES',
          featureKey: 'configuracion.revisor-salidas',
        },
      },
      {
        path: 'revisores-areas',
        component: RevisoresAreas,
        canActivate: [roleGuard],
        data: {
          titulo: 'CONFIGURACIÓN - REVISORES DE ÁREAS',
          featureKey: 'configuracion.revisores-areas',
        },
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
