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
    path: 'dashboard',
    loadComponent: () =>
      import('./features/lessons-dashboard/components/lessons-dashboard')
        .then((m) => m.LessonsDashboard),
    canActivate: [roleGuard],
    data: { titulo: 'DASHBOARD DE LECCIONES APRENDIDAS', featureKey: 'mejora-continua.dashboard' },
  },
  {
    path: 'lecciones-configuracion',
    loadComponent: () =>
      import('./features/configuration/lecciones-configuracion/lecciones-configuracion')
        .then((m) => m.LeccionesConfiguracion),
    canActivate: [roleGuard],
    data: { titulo: 'CONFIGURACIÓN DE LECCIONES', featureKey: 'mejora-continua.config.lecciones-configuracion' },
  },
  {
    path: 'configuration/areas',
    loadComponent: () =>
      import('./features/configuration/lesson-areas/lesson-areas')
        .then((m) => m.LessonAreas),
    canActivate: [roleGuard],
    data: { titulo: 'ÁREAS', featureKey: 'mejora-continua.config.areas' },
  },
  {
    path: 'configuration/area-relations',
    loadComponent: () =>
      import('./features/configuration/areas-subareas/components/areas')
        .then((m) => m.Areas),
    canActivate: [roleGuard],
    data: { titulo: 'RELACIONES POR ÁREA', featureKey: 'mejora-continua.config.area-relations' },
  },
  {
    path: 'configuration/templates',
    loadComponent: () =>
      import('./features/configuration/templates/components/templates')
        .then((m) => m.Templates),
    canActivate: [roleGuard],
    data: { titulo: 'PLANTILLAS', featureKey: 'mejora-continua.config.templates' },
  },
  {
    path: 'configuration/catalog-types',
    loadComponent: () =>
      import('./features/configuration/catalog-types/catalog-types')
        .then((m) => m.CatalogTypes),
    canActivate: [roleGuard],
    data: { titulo: 'TIPOS DE CATÁLOGO', featureKey: 'mejora-continua.config.catalog-types' },
  },
  {
    path: 'configuration/catalog-items',
    loadComponent: () =>
      import('./features/configuration/catalog-items/catalog-items')
        .then((m) => m.CatalogItems),
    canActivate: [roleGuard],
    data: { titulo: 'ÍTEMS DE CATÁLOGO', featureKey: 'mejora-continua.config.catalog-items' },
  },
  {
    path: 'configuration/reminders',
    loadComponent: () =>
      import('./features/configuration/lesson-reminders/components/lesson-reminders')
        .then((m) => m.LessonReminders),
    canActivate: [roleGuard],
    data: { titulo: 'RECORDATORIOS DE LECCIONES', featureKey: 'mejora-continua.config.reminders' },
  },
];
