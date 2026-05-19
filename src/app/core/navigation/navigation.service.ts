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
            { label: 'Lugares',  route: '/gestion-administrativa/configuracion/lugares',  featureKey: 'gestion-administrativa.config.lugares' },
            { label: 'Motivos',  route: '/gestion-administrativa/configuracion/motivos',  featureKey: 'gestion-administrativa.config.motivos' },
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
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Áreas', route: '/mejora-continua/configuration/areas', featureKey: 'mejora-continua.config.areas' },
            { label: 'Relaciones', route: '/mejora-continua/configuration/relations', featureKey: 'mejora-continua.config.relations' },
            { label: 'Plantillas', route: '/mejora-continua/configuration/templates', featureKey: 'mejora-continua.config.templates' },
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
        { label: 'Dashboard Lecciones',           route: '/projects/dashboard',                    featureKey: 'projects.dashboard' },
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
            { label: 'Fases',              route: '/projects/configuration/phases',          featureKey: 'projects.config.phases' },
            { label: 'Etapas',             route: '/projects/configuration/stages',          featureKey: 'projects.config.stages' },
            { label: 'Niveles',            route: '/projects/configuration/layers',          featureKey: 'projects.config.layers' },
            { label: 'Subetapas',          route: '/projects/configuration/sub-stages',      featureKey: 'projects.config.sub-stages' },
            { label: 'Subespecialidades',  route: '/projects/configuration/sub-specialties', featureKey: 'projects.config.sub-specialties' },
            { label: 'Recordatorios Lecciones', route: '/projects/configuration/reminders', featureKey: 'projects.config.reminders' },
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
      label: 'SSOMA',
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
      key: 'habilitacion',
      label: 'Habilitación',
      iconKey: 'habilitacion',
      baseRoute: '/habilitacion',
      items: [],
      groups: [
        {
          label: 'Gestión',
          items: [
            { label: 'Trabajadores',       route: '/habilitacion/trabajadores', featureKey: 'habilitacion.trabajadores' },
            { label: 'Empresa',            route: '/habilitacion/empresa',      featureKey: 'habilitacion.empresa' },
            { label: 'Equipos y Máquinas', route: '/habilitacion/equipos',      featureKey: 'habilitacion.equipos' },
            { label: 'SCTR y Vida Ley',    route: '/habilitacion/sctr-vidaley', featureKey: 'habilitacion.sctr-vidaley' },
            { label: 'Inducciones',        route: '/habilitacion/inducciones',  roles: ['CONTRATISTA'] },
          ],
        },
        {
          label: 'Operaciones',
          items: [
            { label: 'Control de Acceso',       route: '/habilitacion/control-acceso',         featureKey: 'habilitacion.control-acceso' },
            { label: 'Bandeja de Aprobaciones', route: '/habilitacion/bandeja',                featureKey: 'habilitacion.bandeja' },
            { label: 'Registros Modelo',        route: '/habilitacion/registros-modelo',       featureKey: 'habilitacion.registros-modelo' },
            { label: 'Evaluación Supervisores', route: '/habilitacion/evaluacion-supervisores', featureKey: 'habilitacion.evaluacion-supervisores' },
          ],
        },
        {
          label: 'Administración',
          items: [
            { label: 'Reglas de Entregables', route: '/habilitacion/reglas',    featureKey: 'habilitacion.reglas' },
            { label: 'Auditoría',             route: '/habilitacion/auditoria', featureKey: 'habilitacion.auditoria' },
            { label: 'Clínicas',              route: '/habilitacion/clinicas' },
          ],
        },
      ],
    },
    {
      key: 'clinica',
      label: 'Clínica',
      iconKey: 'clinica',
      baseRoute: '/clinica',
      items: [],
      groups: [
        {
          label: 'Gestión',
          items: [
            { label: 'Agenda del Día', route: '/clinica/agenda',           featureKey: 'clinica.agenda' },
            { label: 'Programaciones', route: '/clinica/programaciones', featureKey: 'clinica.programaciones' },
          ],
        },
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
    return this.config
      .map((m) => ({
        ...m,
        items: this.filterItems(m.items),
        groups: this.filterGroups(m.groups),
      }))
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
