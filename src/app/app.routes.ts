import { Routes } from '@angular/router';
import { Inicio } from './features/home/inicio';
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
      },

      {
        path: 'contractors',
        loadChildren: () =>
          import('./features/contractors/contractors.routes')
          .then(m => m.CONTRACTORS_ADMIN_ROUTES)
      },

      {
        path: 'arquitectura-comercial',
        loadChildren: () =>
          import('./features/arquitectura-comercial/arquitectura-comercial-module')
          .then(m => m.ArquitecturaComercialModule)
      },

      {
        path: 'ssoma',
        loadChildren: () =>
          import('./features/ssoma/ssoma.routes')
          .then(m => m.SSOMA_ROUTES)
      },

      {
        path: 'configuracion',
        loadChildren: () =>
          import('./features/configuracion/configuracion.routes')
          .then(m => m.CONFIGURACION_ROUTES)
      }
    ]
  },

  {
    path: 'contractors',
    loadChildren: () =>
      import('./features/contractors/contractors.routes')
      .then(m => m.CONTRACTORS_ROUTES)
  },

  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
