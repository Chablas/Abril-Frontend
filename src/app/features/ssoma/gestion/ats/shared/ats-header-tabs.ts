import { AbrilPageTab } from '../../../../../shared/components/abril-page-header/abril-page-header.component';

/** Tabs compartidos entre TODAS las páginas de nivel superior de ATS Digital y PETAR — un
 *  único array para que no se desincronicen entre sí (pasó antes: ats-lista.ts y
 *  ats-plantillas.ts traían cada uno su propia copia, y una quedó desactualizada). */
export const ATS_HEADER_TABS: AbrilPageTab[] = [
  { label: 'Listado ATS', icono: 'ti-list', route: '/ssoma/gestion/ats', exact: true },
  { label: 'PETAR', icono: 'ti-shield-exclamation', route: '/ssoma/gestion/petar', exact: true },
  { label: 'Plantillas', icono: 'ti-clipboard-list', route: '/ssoma/gestion/ats/plantillas', exact: true },
  { label: 'Pasos por puesto', icono: 'ti-users', route: '/ssoma/gestion/ats/plantillas/pasos', exact: true },
  { label: 'Autorizaciones', icono: 'ti-file-signature', route: '/ssoma/gestion/ats/plantillas/autorizaciones', exact: true },
  { label: 'Riesgos', icono: 'ti-alert-triangle', route: '/ssoma/gestion/ats/plantillas/riesgos', exact: true },
  { label: 'Controles', icono: 'ti-shield-check', route: '/ssoma/gestion/ats/plantillas/controles', exact: true },
  { label: 'Plantillas por puesto', icono: 'ti-briefcase', route: '/ssoma/gestion/ats/plantillas/plantillas-puesto', exact: true },
];
