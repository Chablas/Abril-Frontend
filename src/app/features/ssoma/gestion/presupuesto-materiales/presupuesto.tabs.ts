import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/**
 * Única lista de tabs del módulo Presupuesto de Materiales — la comparten las 6 páginas
 * (Cargas S10, Revisión, Drivers, Ratios, Kits/BOM, Catálogo) para que se vean idénticas
 * en cualquier pantalla. Todas usan `route` (routerLink real), nunca `active` local —
 * eso evita el bug NG0103 que salió antes al mezclar dos rutas sobre el mismo componente.
 */
export const PRESUPUESTO_TABS: AbrilPageTab[] = [
  { label: 'Cargas S10',              icono: 'ti-file-spreadsheet', route: '/ssoma/gestion/presupuesto-materiales' },
  { label: 'Revisión de Materiales',  icono: 'ti-clipboard-check', route: '/ssoma/gestion/presupuesto-materiales/revision' },
  { label: 'Drivers',                 icono: 'ti-settings',        route: '/ssoma/gestion/presupuesto-materiales/drivers' },
  { label: 'Ratios',                  icono: 'ti-chart-bar',       route: '/ssoma/gestion/presupuesto-materiales/ratios' },
  { label: 'Kits / BOM',              icono: 'ti-package',         route: '/ssoma/gestion/presupuesto-materiales/kits' },
  { label: 'Catálogo',                icono: 'ti-list-details',    route: '/ssoma/gestion/presupuesto-materiales/catalogo' },
];
