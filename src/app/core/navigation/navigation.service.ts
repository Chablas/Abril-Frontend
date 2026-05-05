import { Injectable } from '@angular/core';
import { NavModule, NavItem, NavGroup } from './nav.model';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class NavigationService {

  private readonly config: NavModule[] = [
    {
      key: 'proyectos',
      label: 'Proyectos',
      iconKey: 'projects',
      baseRoute: '/projects',
      roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES', 'USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
      items: [
        {
          label: 'Lecciones aprendidas',
          route: '/projects/lessons',
          roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
        },
        {
          label: 'Dashboard Lecciones',
          route: '/projects/dashboard',
          roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
        },
        {
          label: 'Cronograma de hitos',
          route: '/projects/milestone-schedule',
          roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES'],
        },
        {
          label: 'Control de IVTs',
          route: '/projects/technical-inspection-visit',
          roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES'],
        },
        {
          label: 'Control de cuaderno de obra',
          route: '/projects/construction-logbook',
          roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES'],
        },
        {
          label: 'Control de respuesta de informes',
          route: '/projects/report-response-control',
          roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES'],
        },
        {
          label: 'Seguimiento y medición de residentes',
          route: '/projects/resident-monitoring-measurement',
          roles: ['ADMINISTRADOR DE RESIDENTES'],
        },
      ],
      groups: [
        {
          label: 'Configuración',
          roles: ['ADMINISTRADOR DE RESIDENTES', 'ADMINISTRADOR DE UDP'],
          items: [
            { label: 'Áreas', route: '/projects/configuration/areas', roles: ['ADMINISTRADOR DE UDP'] },
            { label: 'Fases', route: '/projects/configuration/phases', roles: ['ADMINISTRADOR DE UDP'] },
            { label: 'Etapas', route: '/projects/configuration/stages', roles: ['ADMINISTRADOR DE UDP'] },
            { label: 'Niveles', route: '/projects/configuration/layers', roles: ['ADMINISTRADOR DE UDP'] },
            { label: 'Subetapas', route: '/projects/configuration/sub-stages', roles: ['ADMINISTRADOR DE UDP'] },
            { label: 'Subespecialidades', route: '/projects/configuration/sub-specialties', roles: ['ADMINISTRADOR DE UDP'] },
            { label: 'Config. Relaciones', route: '/projects/configuration/relations', roles: ['ADMINISTRADOR DE UDP'] },
            { label: 'Recordatorios Lecciones', route: '/projects/configuration/reminders', roles: ['ADMINISTRADOR DE UDP'] },
            { label: 'Hitos', route: '/projects/configuration/milestones', roles: ['ADMINISTRADOR DE RESIDENTES'] },
          ],
        },
      ],
    },
    {
      key: 'contratistas',
      label: 'Contratistas',
      iconKey: 'contractors',
      baseRoute: '/contractors',
      roles: ['USUARIO DE COSTOS Y PRESUPUESTOS'],
      items: [
        {
          label: 'Registro de contratistas',
          route: '/contractors/registro',
        },
        {
          label: 'Homologación de contratistas',
          route: '/contractors/management',
        },
      ],
    },
    {
      key: 'costos',
      label: 'Costos y Presupuesto',
      iconKey: 'costs',
      baseRoute: '/costs',
      roles: ['USUARIO DE COSTOS Y PRESUPUESTOS'],
      items: [
        {
          label: 'Adjudicaciones',
          route: '/costs/adjudicaciones',
        },
      ],
      groups: [
        {
          label: 'Configuración',
          roles: ['USUARIO DE COSTOS Y PRESUPUESTOS'],
          items: [
            { label: 'Correos por Proyecto', route: '/costs/configuration/staff-project-email' },
            { label: 'Partidas de control', route: '/costs/configuration/work-item-category' },
            { label: 'Partidas', route: '/costs/configuration/work-item' },
          ],
        },
      ],
    },
    {
      key: 'arquitectura-comercial',
      label: 'Arquitectura Comercial',
      iconKey: 'projects',
      baseRoute: '/arquitectura-comercial',
      roles: ['USUARIO DE ARQUITECTURA COMERCIAL'],
      items: [
        {
          label: 'Dashboard',
          route: '/arquitectura-comercial/dashboard',
        },
        {
          label: 'Actividades',
          route: '/arquitectura-comercial/actividades',
        },
        {
          label: 'Gantt',
          route: '/arquitectura-comercial/gantt',
        },
        {
          label: 'Plantilla',
          route: '/arquitectura-comercial/plantilla',
        },
      ],
    },
    {
      key: 'ssoma',
      label: 'SSOMA',
      iconKey: 'ssoma',
      baseRoute: '/ssoma',
      roles: [
        'ADMINISTRADOR DEL SISTEMA',
        'ADMINISTRADOR DE UDP',
        'USUARIO DE UDP',
        'ADMINISTRADOR DE RESIDENTES',
        'RESIDENTE',
      ],
      items: [],
      groups: [
        {
          label: 'Salud Ocupacional',
          items: [
            { label: 'Dashboard', route: '/ssoma/salud-ocupacional/dashboard' },
            { label: 'EMOs', route: '/ssoma/salud-ocupacional/emos' },
            { label: 'Programaciones', route: '/ssoma/salud-ocupacional/programaciones' },
            { label: 'Interconsultas', route: '/ssoma/salud-ocupacional/interconsultas' },
            { label: 'Convalidaciones', route: '/ssoma/salud-ocupacional/convalidaciones' },
            { label: 'Catálogos', route: '/ssoma/salud-ocupacional/catalogos' },
          ],
        },
      ],
    },
    {
      key: 'habilitacion',
      label: 'Habilitación',
      iconKey: 'habilitacion',
      baseRoute: '/habilitacion',
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP', 'CONTRATISTA'],
      items: [],
      groups: [
        {
          label: 'Gestión',
          items: [
            { label: 'Trabajadores', route: '/habilitacion/trabajadores' },
            { label: 'Empresa', route: '/habilitacion/empresa', roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'] },
            { label: 'Equipos y Máquinas', route: '/habilitacion/equipos', roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'] },
            { label: 'SCTR y Vida Ley', route: '/habilitacion/sctr-vidaley', roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'] },
          ],
        },
        {
          label: 'Operaciones',
          items: [
            { label: 'Control de Acceso', route: '/habilitacion/control-acceso', roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'] },
            { label: 'Bandeja de Aprobaciones', route: '/habilitacion/bandeja', roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'] },
            { label: 'Registros Modelo', route: '/habilitacion/registros-modelo' },
            { label: 'Evaluación Supervisores', route: '/habilitacion/evaluacion-supervisores', roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'] },
          ],
        },
        {
          label: 'Administración',
          items: [
            { label: 'Reglas de Entregables', route: '/habilitacion/reglas', roles: ['ADMINISTRADOR SSOMA'] },
            { label: 'Auditoría', route: '/habilitacion/auditoria', roles: ['ADMINISTRADOR SSOMA'] },
          ],
        },
      ],
    },
    {
      key: 'seguridad',
      label: 'Seguridad',
      iconKey: 'security',
      baseRoute: '/security',
      roles: ['ADMINISTRADOR DEL SISTEMA'],
      items: [
        {
          label: 'Creación de usuarios',
          route: '/security/users',
        },
      ],
    },
    {
      key: 'configuracion',
      label: 'Configuración',
      iconKey: 'settings',
      baseRoute: '/configuracion',
      roles: ['ADMINISTRADOR DEL SISTEMA', 'ADMINISTRADOR DE UDP', 'USUARIO DE COSTOS Y PRESUPUESTOS'],
      items: [
        {
          label: 'Proyectos',
          route: '/configuracion/proyectos',
          roles: ['ADMINISTRADOR DE UDP', 'USUARIO DE COSTOS Y PRESUPUESTOS'],
        },
        {
          label: 'Razones Sociales',
          route: '/configuracion/companies',
          roles: ['ADMINISTRADOR DEL SISTEMA', 'ADMINISTRADOR DE UDP'],
        },
        {
          label: 'Lista de Trabajadores',
          route: '/configuracion/workers',
          roles: ['ADMINISTRADOR DEL SISTEMA', 'ADMINISTRADOR DE UDP'],
        },
      ],
    },
  ];

  constructor(private authService: AuthService) {}

  getModules(): NavModule[] {
    return this.config.filter(m => this.hasAnyRole(m.roles));
  }

  filterItems(items: NavItem[]): NavItem[] {
    return items.filter(i => !i.roles || this.hasAnyRole(i.roles));
  }

  filterGroups(groups: NavGroup[] | undefined): NavGroup[] {
    if (!groups) return [];
    return groups
      .filter(g => !g.roles || this.hasAnyRole(g.roles))
      .map(g => ({ ...g, items: this.filterItems(g.items) }))
      .filter(g => g.items.length > 0);
  }

  private hasAnyRole(roles: string[]): boolean {
    return roles.some(r => this.authService.hasRole(r));
  }
}
