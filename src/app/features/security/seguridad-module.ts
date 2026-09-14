import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Users } from './pages/users/users';
import { Roles } from './pages/roles/roles';
import { Funcionalidades } from './features/funcionalidades/components/funcionalidades';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'users',
        children: [
          {
            path: '',
            component: Users,
            canActivate: [roleGuard],
            data: { titulo: 'USUARIOS', featureKey: 'security.users' },
          },
        ],
      },
      {
        path: 'roles',
        children: [
          {
            path: '',
            component: Roles,
            canActivate: [roleGuard],
            data: { titulo: 'ROLES', featureKey: 'security.roles' },
          },
        ],
      },
      {
        // Solo lectura: las funcionalidades se dan de alta por base de datos.
        path: 'features',
        children: [
          {
            path: '',
            component: Funcionalidades,
            canActivate: [roleGuard],
            data: { titulo: 'FUNCIONALIDADES', featureKey: 'security.features' },
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule, Users, Roles, Funcionalidades],
  exports: [RouterModule],
})
export class SeguridadModule {}
