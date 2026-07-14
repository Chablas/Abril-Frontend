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
      behavior: 'expand',
      landing: '/gestion-administrativa/solicitud-salidas',
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
            { label: 'Revisores de Trabajadores', route: '/gestion-administrativa/configuracion/revisor-salidas', featureKey: 'gestion-administrativa.config.revisor-salidas' },
            { label: 'Revisores de Áreas', route: '/gestion-administrativa/configuracion/revisores-areas', featureKey: 'gestion-administrativa.config.revisores-areas' },
            { label: 'Visibilidad de Salidas', route: '/gestion-administrativa/configuracion/visibilidad-salidas', featureKey: 'gestion-administrativa.config.visibilidad-salidas' },
            { label: 'Carpeta Adjuntos', route: '/gestion-administrativa/configuracion/carpeta-adjuntos', featureKey: 'gestion-administrativa.config.carpeta-adjuntos' },
          ],
        },
      ],
    },
    {
      key: 'mejora-continua',
      label: 'Mejora Continua',
      iconKey: 'trending-up',
      baseRoute: '/mejora-continua',
      behavior: 'expand',
      landing: '/mejora-continua/dashboard',
      items: [
        { label: 'Dashboard',            route: '/mejora-continua/dashboard',        featureKey: 'mejora-continua.dashboard' },
        { label: 'Lecciones aprendidas', route: '/mejora-continua/lessons-learned',  featureKey: 'mejora-continua.lessons-learned' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Configuración de lecciones', route: '/mejora-continua/lecciones-configuracion',     featureKey: 'mejora-continua.config.lecciones-configuracion' },
            { label: 'Áreas',                       route: '/mejora-continua/configuration/areas',          featureKey: 'mejora-continua.config.areas' },
            { label: 'Relaciones por área',         route: '/mejora-continua/configuration/area-relations', featureKey: 'mejora-continua.config.area-relations' },
            { label: 'Plantillas',                  route: '/mejora-continua/configuration/templates',      featureKey: 'mejora-continua.config.templates' },
            { label: 'Tipos de catálogo',           route: '/mejora-continua/configuration/catalog-types',  featureKey: 'mejora-continua.config.catalog-types' },
            { label: 'Ítems de catálogo',           route: '/mejora-continua/configuration/catalog-items',  featureKey: 'mejora-continua.config.catalog-items' },
            { label: 'Recordatorios',               route: '/mejora-continua/configuration/reminders',      featureKey: 'mejora-continua.config.reminders' },
          ],
        },
      ],
    },
    {
      key: 'proyectos',
      label: 'Proyectos',
      iconKey: 'building-estate',
      baseRoute: '/projects',
      behavior: 'expand',
      landing: '/projects/projects-dashboard',
      items: [
        { label: 'Dashboard de Proyectos',                  route: '/projects/projects-dashboard',           featureKey: 'projects.projects-dashboard' },
        { label: 'Cronograma de Actividades',               route: '/projects/cronograma-actividades',       featureKey: 'projects.cronograma-actividades' },
        { label: 'Dashboard UDP',                           route: '/projects/cronograma-dashboard',         featureKey: 'projects.cronograma-dashboard' },
        // 'Dashboard Lecciones' movido a Mejora Continua (/mejora-continua/dashboard)
        { label: 'Actas de Reunión',                        route: '/projects/actas-reunion',                featureKey: 'projects.actas-reunion' },
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
      behavior: 'expand',
      landing: '/contractors/management',
      items: [
        { label: 'Registro de contratistas',    route: '/contractors/registro', featureKey: 'contractors.registro' },
        { label: 'Homologación de contratistas', route: '/contractors/management', featureKey: 'contractors.management' },
      ],
    },
    {
      key: 'costos',
      label: 'Costos y Presupuestos',
      iconKey: 'coins',
      baseRoute: '/costs',
      behavior: 'expand',
      landing: '/costs/adjudicaciones',
      items: [
        { label: 'Dashboard', route: '/costs/dashboard', featureKey: 'costs.dashboard' },
        { label: 'Adjudicaciones', route: '/costs/adjudicaciones', featureKey: 'costs.adjudicaciones' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Partidas',             route: '/costs/configuration/work-item',            featureKey: 'costs.config.work-item' },
            { label: 'Partidas de control',  route: '/costs/configuration/work-item-category',  featureKey: 'costs.config.work-item-category' },
            { label: 'Especialidades',       route: '/costs/configuration/work-specialty',       featureKey: 'costs.config.work-specialty' },
            { label: 'Correos por Proyecto', route: '/costs/configuration/staff-project-email', featureKey: 'costs.config.staff-project-email' },
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
      behavior: 'expand',
      landing: '/arquitectura-comercial/dashboard',
      items: [
        { label: 'Gestión de Actividades',   route: '/arquitectura-comercial/dashboard', featureKey: 'arquitectura-comercial.dashboard' },
        { label: 'Gestión de Observaciones', route: '/arquitectura-comercial/observaciones/dashboard', featureKey: 'arquitectura-comercial.observaciones.dashboard' },
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
      behavior: 'expand',
      landing: '/ssoma/gestion/paso/dashboard',
      items: [
        { label: 'Prog. Anual SSOMA', route: '/ssoma/gestion/paso/dashboard', featureKey: 'ssoma.gestion.paso' },
        { label: 'Gestión RAC', route: '/ssoma/gestion/rac/dashboard', featureKey: 'ssoma.gestion.rac' },
        { label: 'Obs. Planeada (OPT)', route: '/ssoma/gestion/opt/dashboard', featureKey: 'ssoma.gestion.opt' },
        { label: 'Inspecciones', route: '/ssoma/gestion/inspeccion/dashboard', featureKey: 'ssoma.gestion.inspeccion' },
        { label: 'Charlas & Capacitaciones', route: '/ssoma/gestion/charlas', featureKey: 'ssoma.gestion.charlas' },
        { label: 'Accidentes e Incidentes', route: '/ssoma/gestion/accidentes-incidentes/lista', featureKey: 'ssoma.gestion.accidentes-incidentes' },
        { label: 'Auditoría de ATS', route: '/ssoma/gestion/auditoria-ats/lista', featureKey: 'ssoma.gestion.auditoria-ats' },
        { label: 'Amonestaciones y Suspensiones', route: '/ssoma/gestion/amonestaciones', featureKey: 'ssoma.gestion.amonestaciones' },
        { label: 'Indicadores SSOMA', route: '/ssoma/gestion/indicadores-proactivos/indicadores-ssoma', featureKey: 'ssoma.gestion.indicadores-proactivos' },
        { label: 'Checklists SSOMA', route: '/ssoma/gestion/checklist', featureKey: 'ssoma.gestion.checklist' },
        { label: 'Proyectos Habilitados SSOMA', route: '/ssoma/gestion/proyectos-habilitados', featureKey: 'ssoma.gestion.proyectos-habilitados' },
        { label: 'Presupuesto Materiales', route: '/ssoma/gestion/presupuesto-materiales', featureKey: 'ssoma.gestion.presupuesto-materiales' },
        { label: 'Horas Hombre', route: '/ssoma/gestion/horas-hombre/dashboard', featureKey: 'ssoma.gestion.horas-hombre' },
      ],
    },
    {
      key: 'habilitacion',
      label: 'Gestión de Ingresos',
      iconKey: 'users-group',
      baseRoute: '/habilitacion/gestion',
      items: [
        { label: 'Gestión de Ingresos', route: '/habilitacion/gestion', featureKey: 'habilitacion.trabajadores' },
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
        { label: 'Clínica', route: '/clinica/dashboard', featureKey: 'clinica.agenda', roles: ['CLINICA'] },
      ],
    },
    {
      key: 'evaluaciones',
      label: 'Evaluaciones',
      iconKey: 'clipboard-check',
      baseRoute: '/evaluaciones',
      behavior: 'redirect',
      landing: '/evaluaciones/dashboard',
      items: [
        { label: 'Dashboard',          route: '/evaluaciones/dashboard',     featureKey: 'evaluaciones.dashboard' },
        { label: 'Evaluar residente',  route: '/evaluaciones/evaluar',       featureKey: 'evaluaciones.evaluar' },
        { label: 'Historial',          route: '/evaluaciones/historial',      featureKey: 'evaluaciones.historial' },
        { label: 'Configuración',      route: '/evaluaciones/configuracion', featureKey: 'evaluaciones.configuracion' },
        { label: 'Asignaciones',           route: '/evaluaciones/asignaciones',          featureKey: 'evaluaciones.asignaciones' },
        { label: 'Ver eval. contratistas', route: '/evaluaciones/ver-contratistas',       featureKey: 'evaluaciones.ver-contratistas' },
        { label: 'Evaluar contratista',    route: '/evaluaciones/evaluar-contratista',    featureKey: 'evaluaciones.evaluar-contratista' },
        { label: 'Dashboard contratistas', route: '/evaluaciones/dashboard-contratistas', featureKey: 'evaluaciones.dashboard-contratistas' },
      ],
      groups: [],
    },
    {
      key: 'vecinos',
      label: 'Administración de Obra',
      iconKey: 'users-group',
      baseRoute: '/vecinos',
      behavior: 'expand',
      landing: '/vecinos/dashboard',
      items: [
        { label: 'Dashboard',               route: '/vecinos/dashboard',            featureKey: 'vecinos.dashboard' },
        { label: 'Gestión de Vecinos',      route: '/vecinos/gestion',              featureKey: 'vecinos.gestion' },
        { label: 'Croquis',                 route: '/vecinos/croquis',              featureKey: 'vecinos.croquis' },
        { label: 'Control de Vencimientos', route: '/vecinos/control-vencimientos', featureKey: 'vecinos.control-vencimientos' },
      ],
    },
    {
      key: 'contabilidad',
      label: 'Contabilidad',
      iconKey: 'receipt',
      baseRoute: '/contabilidad',
      behavior: 'expand',
      landing: '/contabilidad/dashboard',
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
      behavior: 'expand',
      landing: '/security/users',
      items: [
        { label: 'Usuarios', route: '/security/users', featureKey: 'security.users' },
        { label: 'Roles',    route: '/security/roles', featureKey: 'security.roles' },
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
    if (!item.featureKey && !item.roles?.length) return true;
    if (item.featureKey && this.getAllowedFeatures().includes(item.featureKey)) return true;
    if (item.roles?.length) {
      // Centinelas por tipo de sesión: CONTRATISTA/CLINICA no viajan en el claim role_id
      // (usan un JWT propio), así que se resuelven por el tipo guardado en localStorage.
      if (item.roles.includes('CONTRATISTA') && this.authService.isContratista()) return true;
      if (item.roles.includes('CLINICA') && this.authService.isClinica()) return true;
      // Roles de staff: se comparan por ID (constantes de roles.ts) contra getRoles().
      if (item.roles.some((r) => this.authService.hasRole(r))) return true;
    }
    return false;
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
              { label: 'Charlas & Capacitaciones', route: '/ssoma/gestion/charlas/contratista' },
              { label: 'Auditoría de ATS', route: '/ssoma/gestion/auditoria-ats/lista' },
              { label: 'Amonestaciones y Suspensiones', route: '/ssoma/gestion/amonestaciones' },
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

  /**
   * Indica si el módulo debe autodesplegarse (accordion) en vez de redirigir.
   * Controlado por `behavior: 'expand'` en la config del módulo.
   */
  isExpandable(module: NavModule): boolean {
    return module.behavior === 'expand';
  }

  /**
   * Resuelve la ruta a la que se debe navegar al hacer clic en un módulo de
   * navegación directa. Prioriza `module.landing` SOLO si el usuario tiene
   * acceso a esa ruta; en caso contrario cae al primer item/grupo accesible.
   * Devuelve null si el usuario no tiene acceso a ninguna funcionalidad del
   * módulo (caso en que el módulo ni siquiera debería mostrarse).
   *
   * El `module` recibido normalmente ya viene filtrado por `getModules()`, pero
   * se vuelve a filtrar por robustez (la operación es idempotente).
   */
  resolveLanding(module: NavModule): string | null {
    const items = this.filterItems(module.items);
    const groupItems = this.filterGroups(module.groups).flatMap((g) => g.items);
    const accessible = [...items, ...groupItems];
    if (accessible.length === 0) return null;

    if (module.landing && accessible.some((i) => i.route === module.landing)) {
      return module.landing;
    }
    return accessible[0].route;
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
