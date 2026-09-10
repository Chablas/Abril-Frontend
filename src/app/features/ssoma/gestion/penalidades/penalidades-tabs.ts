import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Gestión de Penalidades — única fuente para sus páginas. */
export const PENALIDADES_TABS: AbrilPageTab[] = [
  { label: 'Lista',      icono: 'ti-gavel',       route: '/ssoma/gestion/penalidades/lista',     featureKey: 'ssoma.gestion.penalidades.lista' },
  { label: 'Catálogos',  icono: 'ti-list-details', route: '/ssoma/gestion/penalidades/catalogos', featureKey: 'ssoma.gestion.penalidades.catalogos' },
];
