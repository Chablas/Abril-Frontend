import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Proyectos — única fuente para todas sus páginas.
 *  Unión de las listas que antes vivían duplicadas por página: 'Actas de Reunión'
 *  solo aparecía en su propia página e 'Hitos' faltaba en ella.
 *  Cada featureKey coincide con el del roleGuard de su ruta (proyectos.routes.ts;
 *  'Cronograma de Hitos' apunta a mejora-continua y 'Hitos' a projects/configuration). */
export const PROJECTS_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',              icono: 'ti-layout-dashboard', route: '/projects/projects-dashboard',            featureKey: 'projects.projects-dashboard' },
  { label: 'Cronograma Actividades', icono: 'ti-calendar',         route: '/projects/cronograma-actividades',        featureKey: 'projects.cronograma-actividades' },
  { label: 'Actas de Reunión',       icono: 'ti-file-description', route: '/projects/actas-reunion',                 featureKey: 'projects.actas-reunion' },
  { label: 'Cronograma de Hitos',    icono: 'ti-flag',             route: '/mejora-continua/milestone-schedule',     featureKey: 'mejora-continua.milestone-schedule' },
  { label: 'Control de IVTs',        icono: 'ti-clipboard',        route: '/projects/technical-inspection-visit',    featureKey: 'projects.ivt-control' },
  { label: 'Cuaderno de Obra',       icono: 'ti-notebook',         route: '/projects/construction-logbook',          featureKey: 'projects.construction-logbook' },
  { label: 'Respuesta de Informes',  icono: 'ti-file-report',      route: '/projects/report-response-control',       featureKey: 'projects.report-response-control' },
  { label: 'Residentes',             icono: 'ti-users',            route: '/projects/resident-monitoring-measurement', featureKey: 'projects.resident-monitoring-measurement' },
  { label: 'Hitos',                  icono: 'ti-settings',         route: '/projects/configuration/milestones',      featureKey: 'projects.config.milestones' },
];
