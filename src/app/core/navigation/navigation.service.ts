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
            { label: 'Proyectos', route: '/projects/configuration/projects', roles: ['ADMINISTRADOR DE UDP'] },
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
      roles: ['ADMINISTRADOR DE UDP'],
      items: [
        {
          label: 'Registro de contratistas',
          route: '/contractors/registro',
        },
        {
          label: 'Gestión de contratistas',
          route: '/contractors/management',
        },
      ],
    },
    {
      key: 'costos',
      label: 'Costos y Presupuesto',
      iconKey: 'costs',
      baseRoute: '/costs',
      roles: ['ADMINISTRADOR DEL SISTEMA'],
      items: [
        {
          label: 'Adjudicaciones',
          route: '/costs/adjudicaciones',
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
      key: 'arquitectura-comercial',
      label: 'Arquitectura Comercial',
      iconKey: 'projects',
      baseRoute: '/arquitectura-comercial',
      roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
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
          label: 'Entregables',
          route: '/arquitectura-comercial/entregables',
        },
        {
          label: 'Gantt',
          route: '/arquitectura-comercial/gantt',
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
