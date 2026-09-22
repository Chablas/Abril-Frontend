import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Roles } from '../../core/constants/roles';

/**
 * Mi Perfil: lo que cada usuario administra de sí mismo. Se abre desde su nombre, arriba a la
 * izquierda del sidebar (no es un módulo del sidebar), y sus secciones se eligen en la barra lateral
 * de `MiPerfilLayout`.
 *
 * La ruta contenedora solo pide sesión (el authGuard del shell). Cada sección es de la persona y no
 * de una funcionalidad, así que se restringe por rol —los MISMOS roles que declara su entrada en
 * `NavigationService.miPerfil`, para que la barra lateral no ofrezca algo que el guard rechace— y
 * no por featureKey.
 */
export const MI_PERFIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/mi-perfil-layout/mi-perfil-layout').then((m) => m.MiPerfilLayout),
    children: [
      // El menú del nombre ya navega directo a la primera sección accesible: esto cubre a quien
      // escribe /mi-perfil a mano.
      { path: '', pathMatch: 'full', redirectTo: 'mi-firma' },
      {
        path: 'mi-firma',
        loadComponent: () =>
          import('./features/mi-firma/components/mi-firma').then((m) => m.MiFirma),
        canActivate: [roleGuard],
        data: {
          titulo: 'MI PERFIL',
          roles: [Roles.USUARIO_DE_ABRIL],
        },
      },
    ],
  },
];
