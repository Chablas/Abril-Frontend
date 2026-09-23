import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Gestión de Residuos — única fuente para sus páginas.
 *  Cada featureKey coincide con el del roleGuard de su ruta (residuos.routes.ts). */
export const RESIDUOS_TABS: AbrilPageTab[] = [
  { label: 'Tipos de residuos',      icono: 'ti-recycle',       route: '/ssoma/gestion/residuos/tipos',                 featureKey: 'ssoma.gestion.residuos.tipos' },
  { label: 'EO-RS',                  icono: 'ti-building-warehouse', route: '/ssoma/gestion/residuos/eo-rs',            featureKey: 'ssoma.gestion.residuos.eo-rs' },
  { label: 'Autorizaciones DME',     icono: 'ti-certificate',   route: '/ssoma/gestion/residuos/autorizaciones-dme',    featureKey: 'ssoma.gestion.residuos.autorizaciones-dme' },
  { label: 'Viajes',                 icono: 'ti-truck',         route: '/ssoma/gestion/residuos/viajes',                featureKey: 'ssoma.gestion.residuos.viajes' },
  { label: 'Declaraciones',          icono: 'ti-file-text',     route: '/ssoma/gestion/residuos/declaraciones',         featureKey: 'ssoma.gestion.residuos.declaraciones' },
  { label: 'Constancias',            icono: 'ti-file-check',    route: '/ssoma/gestion/residuos/constancias',           featureKey: 'ssoma.gestion.residuos.constancias' },
  { label: 'Constancias finales',    icono: 'ti-file-invoice',  route: '/ssoma/gestion/residuos/constancias-finales',   featureKey: 'ssoma.gestion.residuos.constancias-finales' },
  { label: 'Documentos de referencia', icono: 'ti-folder',      route: '/ssoma/gestion/residuos/documentos-referencia', featureKey: 'ssoma.gestion.residuos.documentos-referencia' },
];
