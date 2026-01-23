import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Layout } from './shared/components/layout/layout';

export const routes: Routes = [
  {
    path: 'proyectos',
    loadChildren: () => {
      return import('./features/proyectos/proyectos-module').then(x => x.ProyectosModule);
    }
  },
  {
    path: 'seguridad',
    loadChildren: () => {
      return import('./features/seguridad/seguridad-module').then(x => x.SeguridadModule);
    }
  },
  { path: '', component: Layout, children: [{ path: '', component: Inicio }] }
];
