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
        path: 'configuracion',
        loadChildren: () =>
          import('./features/configuracion/configuracion-module')
          .then(m => m.ConfiguracionModule)
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
        path: 'habilitacion',
        loadChildren: () =>
          import('./features/habilitacion/habilitacion.routes')
          .then(m => m.HABILITACION_ROUTES)
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
    path: 'habilitacion/registro-empresa',
    loadComponent: () =>
      import('./features/habilitacion/pages/registro-empresa/registro-empresa')
      .then(m => m.RegistroEmpresa)
  },

  {
    path: 'auth/activar-contratista',
    loadComponent: () =>
      import('./features/auth/pages/activar-contratista/activar-contratista')
      .then(m => m.ActivarContratista)
  },

  {
    path: 'auth/recuperar-contratista',
    loadComponent: () =>
      import('./features/auth/pages/recuperar-contratista/recuperar-contratista')
      .then(m => m.RecuperarContratista)
  },

  {
    path: 'registros-modelo',
    loadComponent: () =>
      import('./features/habilitacion/pages/registros-modelo/registros-modelo')
      .then(m => m.RegistrosModelo),
    data: { publicMode: true }
  },

  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
