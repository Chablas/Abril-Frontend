import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Gestión RAC — única fuente para sus páginas.
 *  Cada featureKey coincide con el del roleGuard de su ruta (rac.routes.ts). Penalidades
 *  ahora es su propio módulo independiente (ssoma/gestion/penalidades), ya no una pestaña de RAC. */
export const RAC_TABS: AbrilPageTab[] = [
  { label: 'Dashboard', icono: 'ti-layout-dashboard', route: '/ssoma/gestion/rac/dashboard', featureKey: 'ssoma.gestion.rac.dashboard' },
  { label: 'Lista',     icono: 'ti-list',             route: '/ssoma/gestion/rac/lista',     featureKey: 'ssoma.gestion.rac.lista' },
];
