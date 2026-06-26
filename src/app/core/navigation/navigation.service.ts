import { Injectable } from '@angular/core';
import { NavModule, NavItem, NavGroup } from './nav.model';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class NavigationService {

  private readonly config: NavModule[] = [
    {
      key: 'gestion-administrativa',
      label: 'Gestión Administrativa',
      iconKey: 'briefcase',
      baseRoute: '/gestion-administrativa',
      items: [
        { label: 'Gestión Administrativa', route: '/gestion-administrativa/solicitud-salidas', featureKey: 'gestion-administrativa.solicitud-salidas' },
      ],
      groups: [],
    },
    {
      key: 'mejora-continua',
      label: 'Mejora Continua',
      iconKey: 'trending-up',
      baseRoute: '/mejora-continua',
      items: [
        { label: 'Mejora Continua', route: '/mejora-continua/dashboard', featureKey: 'mejora-continua.dashboard' },
      ],
      groups: [],
    },
    {
      key: 'proyectos',
      label: 'Proyectos',
      iconKey: 'building-estate',
      baseRoute: '/projects',
      items: [
        { label: 'Dashboard de Proyectos',                  route: '/projects/projects-dashboard',           featureKey: 'projects.projects-dashboard' },
        { label: 'Cronograma de Actividades',               route: '/projects/cronograma-actividades',       featureKey: 'projects.cronograma-actividades' },
        { label: 'Dashboard UDP',                           route: '/projects/cronograma-dashboard',         featureKey: 'projects.cronograma-dashboard' },
        // 'Dashboard Lecciones' movido a Mejora Continua (/mejora-continua/dashboard)
        { label: 'Cronograma de hitos',                     route: '/projects/milestone-schedule',           featureKey: 'projects.milestone-schedule' },
        { label: 'Control de IVTs',                         route: '/projects/technical-inspection-visit',   featureKey: 'projects.ivt-control' },
        { label: 'Control de cuaderno de obra',             route: '/projects/construction-logbook',         featureKey: 'projects.construction-logbook' },
        { label: 'Control de respuesta de informes',        route: '/projects/report-response-control',      featureKey: 'projects.report-response-control' },
        { label: 'Seguimiento y medición de residentes',    route: '/projects/resident-monitoring-measurement', featureKey: 'projects.resident-monitoring-measurement' },
      ],
      groups: [],
    },
    {
      key: 'contratistas',
      label: 'Contratistas',
      iconKey: 'file-certificate',
      baseRoute: '/contractors',
      items: [
        { label: 'Registro de contratistas',    route: '/contractors/registro', featureKey: 'contractors.registro' },
        { label: 'Homologación de contratistas', route: '/contractors/management', featureKey: 'contractors.management' },
      ],
    },
    {
      key: 'costos',
      label: 'Costos y Presupuesto',
      iconKey: 'coins',
      baseRoute: '/costs',
      items: [
        { label: 'Dashboard', route: '/costs/dashboard', featureKey: 'costs.dashboard' },
        { label: 'Adjudicaciones', route: '/costs/adjudicaciones', featureKey: 'costs.adjudicaciones' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Correos por Proyecto', route: '/costs/configuration/staff-project-email', featureKey: 'costs.config.staff-project-email' },
            { label: 'Partidas de control',  route: '/costs/configuration/work-item-category',  featureKey: 'costs.config.work-item-category' },
            { label: 'Partidas',             route: '/costs/configuration/work-item',            featureKey: 'costs.config.work-item' },
            { label: 'Especialidades',       route: '/costs/configuration/work-specialty',       featureKey: 'costs.config.work-specialty' },
            { label: 'Planos por proyecto',  route: '/costs/configuration/project-link',         featureKey: 'costs.config.project-link' },
            { label: 'Carpeta adjudicaciones', route: '/costs/configuration/adjudicacion-folder', featureKey: 'costs.config.adjudicacion-folder' },
            { label: 'Correos C. y Ppto.',   route: '/costs/configuration/costos-presupuestos-email', featureKey: 'costs.config.costos-presupuestos-email' },
          ],
        },
      ],
    },
    {
      key: 'arquitectura-comercial',
      label: 'Arquitectura Comercial',
      iconKey: 'building',
      baseRoute: '/arquitectura-comercial',
      items: [
        { label: 'Dashboard',   route: '/arquitectura-comercial/dashboard',  featureKey: 'arquitectura-comercial.dashboard' },
        { label: 'Actividades', route: '/arquitectura-comercial/actividades', featureKey: 'arquitectura-comercial.actividades' },
        { label: 'Gantt',       route: '/arquitectura-comercial/gantt',       featureKey: 'arquitectura-comercial.gantt' },
        { label: 'Plantilla',   route: '/arquitectura-comercial/plantilla',   featureKey: 'arquitectura-comercial.plantilla' },
      ],
      groups: [],
    },
    {
      key: 'ssoma',
      label: 'Salud',
      iconKey: 'heart-rate-monitor',
      baseRoute: '/ssoma',
      items: [
        { label: 'Salud Ocupacional', route: '/ssoma/salud-ocupacional/dashboard', featureKey: 'ssoma.salud-ocupacional.dashboard' },
      ],
      groups: [],
    },
    {
      key: 'gestion-ssoma',
      label: 'Gestión SSOMA',
      iconKey: 'shield',
      baseRoute: '/ssoma/gestion',
      items: [
        { label: 'Prog. Anual SSOMA', route: '/ssoma/gestion/paso/dashboard', featureKey: 'ssoma.gestion.paso' },
        { label: 'Gestión RAC', route: '/ssoma/gestion/rac/dashboard', featureKey: 'ssoma.gestion.rac' },
        { label: 'Obs. Planeada (OPT)', route: '/ssoma/gestion/opt/dashboard', featureKey: 'ssoma.gestion.opt' },
        { label: 'Inspecciones', route: '/ssoma/gestion/inspeccion/dashboard', featureKey: 'ssoma.gestion.inspeccion' },
        { label: 'Charlas & Capacitaciones', route: '/ssoma/gestion/charlas', featureKey: 'ssoma.gestion.charlas' },
        { label: 'Accidentes e Incidentes', route: '/ssoma/gestion/accidentes-incidentes/lista', featureKey: 'ssoma.gestion.accidentes-incidentes' },
        { label: 'Auditoría de ATS', route: '/ssoma/gestion/auditoria-ats/lista', featureKey: 'ssoma.gestion.auditoria-ats' },
        { label: 'Amonestaciones y Suspensiones', route: '/ssoma/gestion/amonestaciones', featureKey: 'ssoma.gestion.amonestaciones' },
        { label: 'Programación de Indicadores', route: '/ssoma/gestion/indicadores-proactivos/programacion', featureKey: 'ssoma.gestion.indicadores-proactivos' },
        { label: 'Seguimiento de Indicadores', route: '/ssoma/gestion/indicadores-proactivos/seguimiento', featureKey: 'ssoma.gestion.indicadores-proactivos' },
        { label: 'Puntaje del Mes', route: '/ssoma/gestion/indicadores-proactivos/puntaje', featureKey: 'ssoma.gestion.indicadores-proactivos' },
        { label: 'Dashboard SSOMA', route: '/ssoma/gestion/indicadores-proactivos/dashboard', featureKey: 'ssoma.gestion.indicadores-proactivos' },
        { label: 'Dashboard por Proyecto', route: '/ssoma/gestion/indicadores-proactivos/dashboard-proyecto', featureKey: 'ssoma.gestion.indicadores-proactivos' },
        { label: 'Desempeño del Supervisor', route: '/ssoma/gestion/indicadores-proactivos/desempeno-supervisor', featureKey: 'ssoma.gestion.indicadores-proactivos' },
      ],
    },
    {
      key: 'habilitacion',
      label: 'Gestión de Ingresos',
      iconKey: 'users-group',
      baseRoute: '/habilitacion/gestion',
      items: [
        { label: 'Gestión de Ingresos', route: '/habilitacion/gestion' },
      ],
      groups: [],
    },
    {
      key: 'control-acceso',
      label: 'Control de Acceso',
      iconKey: 'shield-check',
      baseRoute: '/habilitacion/control-acceso',
      items: [
        { label: 'Control de Acceso', route: '/habilitacion/control-acceso', featureKey: 'habilitacion.control-acceso' },
      ],
    },
    {
      key: 'clinica',
      label: 'Clínica',
      iconKey: 'heart-rate-monitor',
      baseRoute: '/clinica',
      items: [
        { label: 'Clínica', route: '/clinica/dashboard', featureKey: 'clinica.agenda' },
      ],
    },
    {
      key: 'evaluaciones',
      label: 'Evaluaciones',
      iconKey: 'clipboard-check',
      baseRoute: '/evaluaciones',
      items: [
        { label: 'Dashboard',          route: '/evaluaciones/dashboard',     featureKey: 'evaluaciones.dashboard' },
        { label: 'Evaluar residente',  route: '/evaluaciones/evaluar',       featureKey: 'evaluaciones.evaluar' },
        { label: 'Historial',          route: '/evaluaciones/historial',      featureKey: 'evaluaciones.historial' },
        { label: 'Configuración',      route: '/evaluaciones/configuracion', featureKey: 'evaluaciones.configuracion' },
        { label: 'Asignaciones',       route: '/evaluaciones/asignaciones',  featureKey: 'evaluaciones.asignaciones' },
      ],
      groups: [],
    },
    {
      key: 'vecinos',
      label: 'Administración de Obra',
      iconKey: 'users-group',
      baseRoute: '/vecinos',
      items: [
        { label: 'Vecinos', route: '/vecinos/dashboard', featureKey: 'vecinos.dashboard' },
      ],
    },
    {
      key: 'contabilidad',
      label: 'Contabilidad',
      iconKey: 'receipt',
      baseRoute: '/contabilidad',
      items: [
        { label: 'Dashboard', route: '/contabilidad/dashboard', featureKey: 'accounting.dashboard' },
        { label: 'Facturas', route: '/contabilidad/facturas', featureKey: 'accounting.invoices' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Configuración', route: '/contabilidad/configuracion', featureKey: 'accounting.configuration' },
          ],
        },
      ],
    },
    {
      key: 'seguridad',
      label: 'Seguridad',
      iconKey: 'shield-lock',
      baseRoute: '/security',
      items: [
        { label: 'Usuarios', route: '/security/users', featureKey: 'security.users' },
      ],
    },
    {
      key: 'configuracion',
      label: 'Configuración',
      iconKey: 'adjustments-horizontal',
      baseRoute: '/configuracion',
      items: [
        { label: 'Proyectos', route: '/configuracion/proyectos', featureKey: 'configuracion.proyectos' },
      ],
    },
  ];

  constructor(private authService: AuthService) {}

  private getAllowedFeatures(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem('allowed_features');
    return raw ? JSON.parse(raw) : [];
  }

  /** Indica si el usuario tiene acceso a la feature indicada. */
  isFeatureAllowed(featureKey: string): boolean {
    return this.getAllowedFeatures().includes(featureKey);
  }

  private isItemAllowed(item: NavItem): boolean {
    if (item.featureKey) return this.getAllowedFeatures().includes(item.featureKey);
    if (item.roles?.length) return item.roles.some((r) => this.authService.hasRole(r));
    return true;
  }

  getModules(): NavModule[] {
    const isContratista = this.authService.isContratista();
    const modulos = this.authService.getContratistaModulos();
    return this.config
      .map((m): NavModule | null => {
        if (m.key === 'habilitacion') {
          if (isContratista && modulos === 'SSOMA') return null;
          const route = isContratista
            ? '/habilitacion/dashboard-contratista'
            : '/habilitacion/gestion';
          return {
            ...m,
            items: [{ label: m.items[0].label, route }],
            groups: this.filterGroups(m.groups),
          };
        }
        if (m.key === 'gestion-ssoma' && isContratista) {
          if (modulos === 'INGRESOS') return null;
          return {
            ...m,
            items: [
              { label: 'Gestión RAC', route: '/ssoma/gestion/rac/dashboard' },
              { label: 'Obs. Planeada (OPT)', route: '/ssoma/gestion/opt/dashboard' },
              { label: 'Inspecciones', route: '/ssoma/gestion/inspeccion/dashboard' },
            ],
            groups: [],
          };
        }
        return {
          ...m,
          items: this.filterItems(m.items),
          groups: this.filterGroups(m.groups),
        };
      })
      .filter((m): m is NavModule => {
        if (m === null) return false;
        if (isContratista) {
          if (m.key === 'habilitacion' && modulos === 'SSOMA') return false;
          if (m.key === 'gestion-ssoma' && modulos === 'INGRESOS') return false;
        }
        // Ocultar módulos sin ninguna funcionalidad accesible: si tras filtrar
        // por allowed_features no queda ningún item ni grupo, el usuario no
        // tiene acceso a nada dentro del módulo y no debe verlo en el sidebar.
        const hasItems = m.items.length > 0;
        const hasGroupItems = (m.groups ?? []).some((g) => g.items.length > 0);
        return hasItems || hasGroupItems;
      });
  }

  filterItems(items: NavItem[]): NavItem[] {
    return items.filter((i) => this.isItemAllowed(i));
  }

  filterGroups(groups: NavGroup[] | undefined): NavGroup[] {
    if (!groups) return [];
    return groups
      .map((g) => ({ ...g, items: this.filterItems(g.items) }))
      .filter((g) => g.items.length > 0);
  }
}
