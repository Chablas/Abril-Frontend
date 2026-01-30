import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Layout } from './shared/components/layout/layout';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => {
      return import('./features/auth/auth-module').then(x => x.AuthModule);
    }
  },
  {
    path: '',
    //canActivateChild: [authGuard],
    children: [
      { path: '', component: Layout, children: [{ path: '', component: Inicio }] },
      {
        path: 'security',
        loadChildren: () => {
          return import('./features/seguridad/seguridad-module').then(x => x.SeguridadModule);
        }
      },
      {
        path: 'projects',
        loadChildren: () => {
          return import('./features/proyectos/proyectos-module').then(x => x.ProyectosModule);
        }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
