import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { Roles } from '../../../core/constants/roles';

/** Pestañas del header de Gestión Administrativa — única fuente para todas sus páginas. */
export const GESTION_ADMINISTRATIVA_TABS: AbrilPageTab[] = [
  // Orden del flujo, alternando quién actúa en cada paso: el trabajador pide, el revisor decide,
  // el trabajador rinde, el revisor revisa y firma, el ERP corrige lo observado y Tesorería paga.
  // Delegación de Revisión va al final porque no es un paso del flujo sino quién lo atiende.
  // Mismo orden que la lista del sidebar (NavigationService) — las dos barras no pueden discrepar.
  { label: 'Solicitud de Salidas',   icono: 'ti-file-text',  route: '/gestion-administrativa/solicitud-salidas',   featureKey: 'gestion-administrativa.solicitud-salidas' },
  { label: 'Gestión de Salidas',     icono: 'ti-briefcase',  route: '/gestion-administrativa/gestion-salidas',     featureKey: 'gestion-administrativa.gestion-salidas' },
  { label: 'Mis Rendiciones',        icono: 'ti-receipt',    route: '/gestion-administrativa/rendiciones',         featureKey: 'gestion-administrativa.rendiciones' },
  { label: 'Gestión de Rendiciones', icono: 'ti-checklist',  route: '/gestion-administrativa/gestion-rendiciones', featureKey: 'gestion-administrativa.gestion-rendiciones' },
  { label: 'Correcciones S10',       icono: 'ti-file-alert', route: '/gestion-administrativa/correcciones-s10',    featureKey: 'gestion-administrativa.correcciones-s10' },
  { label: 'Reembolsos',             icono: 'ti-cash',       route: '/gestion-administrativa/reembolsos',          featureKey: 'gestion-administrativa.reembolsos' },
  { label: 'Delegación de Revisión', icono: 'ti-user-check', route: '/gestion-administrativa/delegacion-revision', featureKey: 'gestion-administrativa.delegacion-revision' },
  // La pestaña se abre también por ROL y no solo por featureKeys: desde que existe la sección
  // "Tu firma" (que es de todo USUARIO DE ABRIL, no de una funcionalidad) la pantalla siempre tiene
  // al menos una sección que mostrar, así que dejarla solo con los featureKeys de configuración
  // habría escondido la firma de la mayoría. El acceso a cada sección sigue filtrado adentro.
  { label: 'Configuración',          icono: 'ti-settings',   route: '/gestion-administrativa/configuracion',       featureKeys: ['gestion-administrativa.config.lugares','gestion-administrativa.config.motivos','gestion-administrativa.config.trayectos','gestion-administrativa.config.capturas','gestion-administrativa.config.visibilidad-salidas','gestion-administrativa.config.carpeta-adjuntos'], roles: [Roles.USUARIO_DE_ABRIL] },
];
