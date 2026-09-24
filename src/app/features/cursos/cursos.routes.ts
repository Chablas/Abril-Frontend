import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const CURSOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/curso-lista/curso-lista').then((m) => m.CursoLista),
    canActivate: [roleGuard],
    data: { titulo: 'CURSOS', featureKey: 'cursos.lista' },
  },
  {
    path: 'editor',
    loadComponent: () =>
      import('./pages/curso-editor/curso-editor').then((m) => m.CursoEditor),
    canActivate: [roleGuard],
    data: { titulo: 'CURSOS - EDITOR', featureKey: 'cursos.lista' },
  },
  {
    path: 'editor/:id',
    loadComponent: () =>
      import('./pages/curso-editor/curso-editor').then((m) => m.CursoEditor),
    canActivate: [roleGuard],
    data: { titulo: 'CURSOS - EDITOR', featureKey: 'cursos.lista' },
  },
  {
    path: ':id/tomar',
    loadComponent: () =>
      import('./pages/curso-player/curso-player').then((m) => m.CursoPlayer),
    canActivate: [roleGuard],
    data: { titulo: 'CURSOS - TOMAR CURSO', featureKey: 'cursos.lista' },
  },
];
