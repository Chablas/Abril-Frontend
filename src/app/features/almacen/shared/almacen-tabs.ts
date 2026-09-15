import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

export const ALMACEN_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',           icono: 'ti-layout-dashboard', route: '/almacen/dashboard',      featureKey: 'almacen.materiales' },
  { label: 'Stock y Movimientos', icono: 'ti-boxes',           route: '/almacen/stock',          featureKey: 'almacen.materiales' },
  { label: 'Órdenes/Contratos',   icono: 'ti-file-invoice',    route: '/almacen/ordenes-compra', featureKey: 'almacen.ordenes-compra' },
];
