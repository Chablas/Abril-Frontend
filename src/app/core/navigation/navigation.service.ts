import { Injectable } from '@angular/core';
import { NavModule, NavItem, NavGroup } from './nav.model';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class NavigationService {

  private readonly config: NavModule[] = [
    {
      key: 'gestion-administrativa',
      label: 'Gestión Administrativa',
      iconKey: 'gestion-administrativa',
      baseRoute: '/gestion-administrativa',
      items: [
        { label: 'Solicitud de Salidas', route: '/gestion-administrativa/solicitud-salidas', featureKey: 'gestion-administrativa.solicitud-salidas' },
        { label: 'Gestión de Salidas',   route: '/gestion-administrativa/gestion-salidas',   featureKey: 'gestion-administrativa.gestion-salidas' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Lugares',   route: '/gestion-administrativa/configuracion/lugares',   featureKey: 'gestion-administrativa.config.lugares' },
            { label: 'Motivos',   route: '/gestion-administrativa/configuracion/motivos',   featureKey: 'gestion-administrativa.config.motivos' },
            { label: 'Trayectos', route: '/gestion-administrativa/configuracion/trayectos', featureKey: 'gestion-administrativa.config.trayectos' },
          ],
        },
      ],
    },
    {
      key: 'mejora-continua',
      label: 'Mejora Continua',
      iconKey: 'mejora-continua',
      baseRoute: '/mejora-continua',
      items: [
        { label: 'Lecciones aprendidas', route: '/mejora-continua/lessons-learned', featureKey: 'mejora-continua.lessons-learned' },
        { label: 'Dashboard Lecciones',  route: '/mejora-continua/dashboard',        featureKey: 'mejora-continua.dashboard' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Configuración de Lecciones', route: '/mejora-continua/lecciones-configuracion', featureKey: 'mejora-continua.config.lecciones-configuracion' },
            { label: 'Recordatorios Lecciones', route: '/mejora-continua/configuration/reminders', featureKey: 'mejora-continua.config.reminders' },
          ],
        },
      ],
    },
    {
      key: 'proyectos',
      label: 'Proyectos',
      iconKey: 'projects',
      baseRoute: '/projects',
      items: [
        { label: 'Dashboard de Proyectos',           route: '/projects/projects-dashboard',           featureKey: 'projects.projects-dashboard' },
        { label: 'Cronograma de Actividades',     route: '/projects/cronograma-actividades',       featureKey: 'projects.cronograma-actividades' },
        // 'Dashboard Lecciones' movido a Mejora Continua (/mejora-continua/dashboard)
        { label: 'Cronograma de hitos',           route: '/projects/milestone-schedule',           featureKey: 'projects.milestone-schedule' },
        { label: 'Control de IVTs',               route: '/projects/technical-inspection-visit',   featureKey: 'projects.ivt-control' },
        { label: 'Control de cuaderno de obra',   route: '/projects/construction-logbook',         featureKey: 'projects.construction-logbook' },
        { label: 'Control de respuesta de informes', route: '/projects/report-response-control',   featureKey: 'projects.report-response-control' },
        { label: 'Seguimiento y medición de residentes', route: '/projects/resident-monitoring-measurement', featureKey: 'projects.resident-monitoring-measurement' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Hitos',              route: '/projects/configuration/milestones',      featureKey: 'projects.config.milestones' },
          ],
        },
      ],
    },
    {
      key: 'contratistas',
      label: 'Contratistas',
      iconKey: 'contractors',
      baseRoute: '/contractors',
      items: [
        { label: 'Registro de contratistas',    route: '/contractors/registro', featureKey: 'contractors.registro' },
        { label: 'Homologación de contratistas', route: '/contractors/management', featureKey: 'contractors.management' },
      ],
    },
    {
      key: 'costos',
      label: 'Costos y Presupuesto',
      iconKey: 'costs',
      baseRoute: '/costs',
      items: [
        { label: 'Adjudicaciones', route: '/costs/adjudicaciones', featureKey: 'costs.adjudicaciones' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Correos por Proyecto', route: '/costs/configuration/staff-project-email', featureKey: 'costs.config.staff-project-email' },
            { label: 'Partidas de control',  route: '/costs/configuration/work-item-category',  featureKey: 'costs.config.work-item-category' },
            { label: 'Partidas',             route: '/costs/configuration/work-item',            featureKey: 'costs.config.work-item' },
            { label: 'Links de proyecto',    route: '/costs/configuration/project-link',         featureKey: 'costs.config.project-link' },
            { label: 'Correos C. y Ppto.',   route: '/costs/configuration/costos-presupuestos-email', featureKey: 'costs.config.costos-presupuestos-email' },
          ],
        },
      ],
    },
    {
      key: 'arquitectura-comercial',
      label: 'Arquitectura Comercial',
      iconKey: 'projects',
      baseRoute: '/arquitectura-comercial',
      items: [
        { label: 'Dashboard',   route: '/arquitectura-comercial/dashboard',  featureKey: 'arquitectura-comercial.dashboard' },
        { label: 'Actividades', route: '/arquitectura-comercial/actividades', featureKey: 'arquitectura-comercial.actividades' },
        { label: 'Gantt',       route: '/arquitectura-comercial/gantt',       featureKey: 'arquitectura-comercial.gantt' },
        { label: 'Plantilla',   route: '/arquitectura-comercial/plantilla',   featureKey: 'arquitectura-comercial.plantilla' },
      ],
    },
    {
      key: 'ssoma',
      label: 'Salud',
      iconKey: 'ssoma',
      baseRoute: '/ssoma',
      items: [],
      groups: [
        {
          label: 'Salud Ocupacional',
          items: [
            { label: 'Dashboard',       route: '/ssoma/salud-ocupacional/dashboard',      featureKey: 'ssoma.salud-ocupacional.dashboard' },
            { label: 'EMOs',            route: '/ssoma/salud-ocupacional/emos',           featureKey: 'ssoma.salud-ocupacional.emos' },
            { label: 'Programaciones',  route: '/ssoma/salud-ocupacional/programaciones', featureKey: 'ssoma.salud-ocupacional.programaciones' },
            { label: 'Interconsultas',  route: '/ssoma/salud-ocupacional/interconsultas', featureKey: 'ssoma.salud-ocupacional.interconsultas' },
            { label: 'Convalidaciones', route: '/ssoma/salud-ocupacional/convalidaciones', featureKey: 'ssoma.salud-ocupacional.convalidaciones' },
            { label: 'Catálogos',       route: '/ssoma/salud-ocupacional/catalogos',      featureKey: 'ssoma.salud-ocupacional.catalogos' },
            { label: 'Reportes',        route: '/ssoma/salud-ocupacional/reportes',       featureKey: 'ssoma.salud-ocupacional.reportes' },
          ],
        },
      ],
    },
    {
      key: 'gestion-ssoma',
      label: 'Gestión SSOMA',
      iconKey: 'gestion-ssoma',
      baseRoute: '/ssoma/gestion',
      items: [
        { label: 'Prog. Anual SSOMA', route: '/ssoma/gestion/paso/dashboard', featureKey: 'ssoma.gestion.paso' },
        { label: 'Gestión RAC', route: '/ssoma/gestion/rac/dashboard', featureKey: 'ssoma.gestion.rac' },
      ],
    },
    {
      key: 'habilitacion',
      label: 'Gestión de Ingresos',
      iconKey: 'habilitacion',
      baseRoute: '/habilitacion/gestion',
      items: [
        { label: 'Gestión de Ingresos', route: '/habilitacion/gestion' },
      ],
      groups: [],
    },
    {
      key: 'control-acceso',
      label: 'Control de Acceso',
      iconKey: 'security',
      baseRoute: '/habilitacion/control-acceso',
      items: [
        { label: 'Control de Acceso', route: '/habilitacion/control-acceso', featureKey: 'habilitacion.control-acceso' },
      ],
    },
    {
      key: 'clinica',
      label: 'Clínica',
      iconKey: 'clinica',
      baseRoute: '/clinica',
      items: [
        { label: 'Clínica', route: '/clinica/dashboard', featureKey: 'clinica.agenda' },
      ],
    },
    {
      key: 'evaluaciones',
      label: 'Evaluaciones',
      iconKey: 'star',
      baseRoute: '/evaluaciones',
      items: [
        { label: 'Dashboard',          route: '/evaluaciones/dashboard',     featureKey: 'evaluaciones.dashboard' },
        { label: 'Evaluar residente',  route: '/evaluaciones/evaluar',       featureKey: 'evaluaciones.evaluar' },
        { label: 'Historial',          route: '/evaluaciones/historial',      featureKey: 'evaluaciones.historial' },
        { label: 'Configuración',      route: '/evaluaciones/configuracion', featureKey: 'evaluaciones.configuracion' },
        { label: 'Asignaciones',       route: '/evaluaciones/asignaciones',  featureKey: 'evaluaciones.asignaciones' },
      ],
    },
    {
      key: 'seguridad',
      label: 'Seguridad',
      iconKey: 'security',
      baseRoute: '/security',
      items: [
        { label: 'Usuarios', route: '/security/users', featureKey: 'security.users' },
        { label: 'Roles',                route: '/security/roles', featureKey: 'security.roles' },
      ],
    },
    {
      key: 'configuracion',
      label: 'Configuración',
      iconKey: 'settings',
      baseRoute: '/configuracion',
      items: [
        { label: 'Proyectos',        route: '/configuracion/proyectos', featureKey: 'configuracion.proyectos' },
        { label: 'Áreas',            route: '/configuracion/area',      featureKey: 'configuracion.area' },
        { label: 'Razones Sociales', route: '/configuracion/companies', featureKey: 'configuracion.companies' },
        { label: 'Lista de Trabajadores', route: '/configuracion/workers', featureKey: 'configuracion.workers' },
      ],
    },
  ];

  constructor(private authService: AuthService) {}

  private getAllowedFeatures(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem('allowed_features');
    return raw ? JSON.parse(raw) : [];
  }

  private isItemAllowed(item: NavItem): boolean {
    if (item.featureKey) return this.getAllowedFeatures().includes(item.featureKey);
    if (item.roles?.length) return item.roles.some((r) => this.authService.hasRole(r));
    return true;
  }

  getModules(): NavModule[] {
    const isContratista = this.authService.isContratista();
    return this.config
      .map((m) => {
        if (m.key === 'habilitacion') {
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
          return {
            ...m,
            items: [{ label: 'Gestión RAC', route: '/ssoma/gestion/rac/dashboard' }],
            groups: [],
          };
        }
        return {
          ...m,
          items: this.filterItems(m.items),
          groups: this.filterGroups(m.groups),
        };
      })
      .filter((m) => m.items.length > 0 || (m.groups && m.groups.length > 0));
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
