import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Proyectos } from './features/proyectos/components/proyectos';
import { Area } from './features/area/components/area';
import { RazonesSociales } from './features/razones-sociales/components/razones-sociales';
import { Bancos } from './features/bancos/components/bancos';
import { Workers } from './pages/workers/workers';
import { Feriados } from './features/feriados/components/feriados';
import { Aprendizaje } from './features/aprendizaje/components/aprendizaje';
// Revisores de áreas: define el jefe de cada área para toda la organización, por lo que
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
        component: RazonesSociales,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - RAZONES SOCIALES', featureKey: 'configuracion.companies' },
      },
      {
        // Catálogo de bancos: de acá sale el banco de cada razón social del grupo, y de ahí el
        // que el formulario de bienvenida le nombra al nuevo colaborador.
        path: 'bancos',
        component: Bancos,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - BANCOS', featureKey: 'configuracion.bancos' },
      },
      {
        path: 'workers',
        component: Workers,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - LISTA DE TRABAJADORES', featureKey: 'configuracion.workers' },
      },
      // Categorías y Puestos se movió a Gestión GTH → Configuración: son datos maestros del
      // catálogo de trabajadores que administra GTH, no configuración global. La ruta se
      // conserva como redirect para no romper enlaces guardados.
      {
        path: 'categorias-puestos',
        redirectTo: '/gestion-gth/configuracion/categorias-puestos',
        pathMatch: 'full',
      },
      // Revisores de Áreas se mudó a Gestión Administrativa → Solicitud de Salidas →
      // Configuración: el revisor es a quien se le manda la solicitud que nace en esa pantalla.
      // Las dos rutas viejas redirigen para no dejar enlaces rotos (la de "Revisores de
      // Trabajadores" se retiró antes: ese jefe se asigna en el formulario de trabajadores).
      {
        path: 'revisor-salidas',
        redirectTo: '/gestion-administrativa/solicitud-salidas/configuracion',
        pathMatch: 'full',
      },
      {
        path: 'revisores-areas',
        redirectTo: '/gestion-administrativa/solicitud-salidas/configuracion',
        pathMatch: 'full',
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
