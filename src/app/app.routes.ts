import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Layout } from './shared/components/layout/layout';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth-module')
      .then(m => m.AuthModule)
  },

  {
    path: '',
    component: Layout,
    canActivateChild: [authGuard],
    children: [
      { path: '', component: Inicio },

      {
        path: 'security',
        loadChildren: () =>
          import('./features/security/seguridad-module')
          .then(m => m.SeguridadModule)
      },

      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/proyectos-module')
          .then(m => m.ProyectosModule)
      },
      {
        path: 'costs',
        loadChildren: () =>
          import('./features/costs/costs-module')
          .then(m => m.CostsModule)
      }
    ]
  },

  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
