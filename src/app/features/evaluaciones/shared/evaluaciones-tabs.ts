import { AbrilPageTabGroup } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { EvAccesoDto } from '../dtos/ev-acceso.model';

/**
 * Fuente única de las pestañas del header en TODAS las páginas de Evaluaciones.
 * Antes cada página traía su propia copia pegada del mismo bloque — el featureKey
 * ya filtra por rol de sistema (ver AbrilPageHeaderComponent), pero varios de estos
 * flujos autorizan por PUESTO real en el backend (Coordinador SSOMA/Prevencionista/
 * Jefe SSOMA — ver EvJefeSsomaController, EvSupervisorContratistaController,
 * EvGestionSsomaController, EvPrevencionistaController), un criterio más fino que el
 * rol. Sin `acceso`, alguien con el featureKey por rol pero sin el puesto exigido
 * veía la pestaña y el backend igual la rechazaba con "No tiene acceso". `acceso`
 * (EvAccesoService) resuelve ese mismo criterio por puesto para no ofrecer una
 * pestaña que de todos modos va a rebotar.
 */
export function buildEvaluacionesTabGroups(acceso: EvAccesoDto | null): AbrilPageTabGroup[] {
  const puedeEvaluarJefeSsoma = !!acceso?.esEquipoSsoma;
  const puedeVerResultadosJefeSsoma = !!acceso?.esJefeSsoma;
  const puedeEvaluarSupervisores = !!acceso?.esEquipoSsoma || !!acceso?.esJefeSsoma;
  // Coordinador SSOMA/Prevencionista son quienes hacen esta evaluación (Flujo A):
  // deben ver el consolidado de lo que ellos mismos evaluaron, no solo el Jefe SSOMA.
  const puedeVerSupervisores = !!acceso?.esJefeSsoma || !!acceso?.esEquipoSsoma;
  const puedeEvaluarGestionSsoma = !!acceso?.esEquipoSsoma || !!acceso?.esJefeSsoma;
  const puedeVerResultadosGestionSsoma = !!acceso?.esJefeSsoma;
  const puedeVerMisResultadosGestionSsoma = !!acceso?.esEquipoSsoma;
  const puedeVerDashboardPrevencionistas = !!acceso?.esJefeSsoma;

  return [
    { label: 'Residentes',   icono: 'ti-user-check', tabs: [
      { label: 'Dashboard',     icono: 'ti-layout-dashboard', route: '/evaluaciones/dashboard',      featureKey: 'evaluaciones.dashboard' },
      { label: 'Evaluar',       icono: 'ti-pencil',           route: '/evaluaciones/evaluar',        featureKey: 'evaluaciones.evaluar' },
      { label: 'Historial',     icono: 'ti-history',          route: '/evaluaciones/historial',      featureKey: 'evaluaciones.historial' },
      { label: 'Configuración', icono: 'ti-settings',         route: '/evaluaciones/configuracion',  featureKey: 'evaluaciones.configuracion' },
      { label: 'Asignaciones',  icono: 'ti-users',            route: '/evaluaciones/asignaciones',   featureKey: 'evaluaciones.asignaciones' },
    ]},
    { label: 'Contratistas', icono: 'ti-building', tabs: [
      { label: 'Dashboard',        icono: 'ti-chart-bar', route: '/evaluaciones/dashboard-contratistas', featureKey: 'evaluaciones.dashboard-contratistas' },
      { label: 'Evaluar',          icono: 'ti-pencil',    route: '/evaluaciones/evaluar-contratista',    featureKey: 'evaluaciones.evaluar-contratista' },
      { label: 'Ver evaluaciones', icono: 'ti-list',      route: '/evaluaciones/ver-contratistas',       featureKey: 'evaluaciones.ver-contratistas' },
    ]},
    { label: 'Superv. Contratista', icono: 'ti-shield-check', tabs: [
      ...(puedeEvaluarSupervisores ? [{ label: 'Evaluar supervisor', icono: 'ti-pencil', route: '/evaluaciones/evaluar-supervisor-contratista', featureKey: 'evaluaciones.evaluar-supervisor-contratista' }] : []),
      ...(puedeVerSupervisores ? [{ label: 'Ver evaluaciones', icono: 'ti-list', route: '/evaluaciones/ver-supervisores-contratista', featureKey: 'evaluaciones.ver-supervisores-contratista' }] : []),
    ]},
    { label: 'Jefe Corporativo SSOMA', icono: 'ti-user-shield', tabs: [
      ...(puedeEvaluarJefeSsoma ? [{ label: 'Evaluar Jefe Corporativo SSOMA', icono: 'ti-pencil', route: '/evaluaciones/evaluar-jefe-ssoma', featureKey: 'evaluaciones.evaluar-jefe-ssoma' }] : []),
      ...(puedeVerResultadosJefeSsoma ? [{ label: 'Resultados', icono: 'ti-report', route: '/evaluaciones/resultados-jefe-ssoma', featureKey: 'evaluaciones.resultados-jefe-ssoma' }] : []),
    ]},
    { label: 'Prevencionistas', icono: 'ti-vest', tabs: [
      ...(puedeVerDashboardPrevencionistas ? [{ label: 'Dashboard', icono: 'ti-chart-bar', route: '/evaluaciones/dashboard-prevencionistas', featureKey: 'evaluaciones.dashboard-prevencionistas' }] : []),
    ]},
    { label: 'Gestión SSOMA', icono: 'ti-users-group', tabs: [
      ...(puedeEvaluarGestionSsoma ? [{ label: 'Evaluar', icono: 'ti-pencil', route: '/evaluaciones/gestion-ssoma', featureKey: 'evaluaciones.gestion-ssoma' }] : []),
      ...(puedeVerResultadosGestionSsoma ? [{ label: 'Resultados', icono: 'ti-report', route: '/evaluaciones/resultados-gestion-ssoma', featureKey: 'evaluaciones.resultados-gestion-ssoma' }] : []),
      ...(puedeVerMisResultadosGestionSsoma ? [{ label: 'Mis resultados', icono: 'ti-chart-bar', route: '/evaluaciones/mis-resultados-gestion-ssoma', featureKey: 'evaluaciones.mis-resultados-gestion-ssoma' }] : []),
    ]},
    { label: 'Administración', icono: 'ti-settings-automation', tabs: [
      ...(!!acceso?.esJefeSsoma ? [{ label: 'Períodos', icono: 'ti-calendar-time', route: '/evaluaciones/periodos', featureKey: 'evaluaciones.periodos' }] : []),
    ]},
  ];
}
