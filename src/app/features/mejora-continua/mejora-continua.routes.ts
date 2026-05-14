import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const MEJORA_CONTINUA_ROUTES: Routes = [
  {
    path: 'lessons-learned',
    loadComponent: () =>
      import('./features/lessons-learned/components/lecciones-aprendidas')
        .then((m) => m.LeccionesAprendidas),
    canActivate: [roleGuard],
    data: { titulo: 'LECCIONES APRENDIDAS', featureKey: 'mejora-continua.lessons-learned' },
  },
  {
    path: 'configuration/areas',
    loadComponent: () =>
      import('./features/configuration/areas-subareas/components/areas')
        .then((m) => m.Areas),
    canActivate: [roleGuard],
    data: { titulo: 'ÁREAS', featureKey: 'mejora-continua.config.areas' },
  },
  {
    path: 'configuration/relations',
    loadComponent: () =>
      import('./features/configuration/relations/relations')
        .then((m) => m.Relations),
    canActivate: [roleGuard],
    data: { titulo: 'CONFIG. RELACIONES', featureKey: 'mejora-continua.config.relations' },
  },
  {
    path: 'configuration/templates',
    loadComponent: () =>
      import('./features/configuration/templates/components/templates')
        .then((m) => m.Templates),
    canActivate: [roleGuard],
    data: { titulo: 'PLANTILLAS', featureKey: 'mejora-continua.config.templates' },
  },
];
