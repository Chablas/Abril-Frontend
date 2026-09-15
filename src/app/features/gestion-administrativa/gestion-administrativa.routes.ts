import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { Roles } from '../../core/constants/roles';

export const GESTION_ADMINISTRATIVA_ROUTES: Routes = [
  { path: '', redirectTo: 'solicitud-salidas', pathMatch: 'full' },
  {
    // Configuración de Solicitud de Salidas: los correos que se ORIGINAN acá (el aviso al
    // revisor y la confirmación al solicitante), el plazo para rendir («Días reembolsables»),
    // los dos recordatorios de ese plazo y los REVISORES de cada área — el revisor es a quien
    // se le manda la solicitud que nace en esta pantalla, así que se administra junto a ella
    // (antes vivía en /configuracion/revisores-areas).
    // Va ANTES de 'solicitud-salidas' para que el segmento 'configuracion' no se lo coma
    // la pantalla.
    // `featureKeys`: basta tener CUALQUIERA de las secciones para entrar; adentro cada una se
    // filtra por la suya.
    path: 'solicitud-salidas/configuracion',
    loadComponent: () =>
      import('./shared/configuracion/pantalla-configuracion').then(
        (m) => m.GaPantallaConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'SOLICITUD DE SALIDAS - CONFIGURACIÓN',
      featureKeys: [
        'gestion-administrativa.config.correos',
        'configuracion.revisores-areas',
      ],
      pantalla: 'solicitud-salidas',
    },
  },
  {
    path: 'solicitud-salidas',
    loadComponent: () =>
      import('./features/solicitud-salidas/components/solicitud-salidas').then(
        (m) => m.SolicitudSalidas,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'SOLICITUD DE SALIDAS',
      featureKey: 'gestion-administrativa.solicitud-salidas',
    },
  },
  {
    // Configuración de Mis Rendiciones: los correos que se ORIGINAN acá (enviar la planilla a
    // primera revisión y avisar del S10). El plazo para rendir («Días reembolsables») estaba acá
    // y se mudó a la configuración de Solicitud de Salidas, que es la pantalla donde se rinde.
    // Va ANTES de 'rendiciones' para que el segmento 'configuracion' no se lo coma
    // la pantalla.
    // Misma feature que ya protegía la sección Correos de Configuración: quien administra los
    // correos de salidas los administra todos.
    path: 'rendiciones/configuracion',
    loadComponent: () =>
      import('./shared/configuracion/pantalla-configuracion').then(
        (m) => m.GaPantallaConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'MIS RENDICIONES - CONFIGURACIÓN',
      featureKey: 'gestion-administrativa.config.correos',
      pantalla: 'rendiciones',
    },
  },
  {
    path: 'rendiciones',
    loadComponent: () =>
      import('./features/rendiciones/components/rendiciones').then((m) => m.Rendiciones),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'MIS RENDICIONES',
      featureKey: 'gestion-administrativa.rendiciones',
    },
  },
  {
    // Configuración de Gestión de Salidas: los correos que se ORIGINAN acá (la solicitud
    // aprobada y la rechazada, que salen de la decisión del revisor) y la VISIBILIDAD de esta
    // bandeja, que antes estaba suelta en Configuración → Visibilidad de Salidas.
    // Va ANTES de 'gestion-salidas' para que el segmento 'configuracion' no se lo coma
    // la pantalla.
    path: 'gestion-salidas/configuracion',
    loadComponent: () =>
      import('./shared/configuracion/pantalla-configuracion').then(
        (m) => m.GaPantallaConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'GESTIÓN DE SALIDAS - CONFIGURACIÓN',
      featureKeys: [
        'gestion-administrativa.config.correos',
        'gestion-administrativa.config.visibilidad-salidas',
      ],
      pantalla: 'gestion-salidas',
    },
  },
  {
    path: 'gestion-salidas',
    loadComponent: () =>
      import('./features/gestion-salidas/components/gestion-salidas').then(
        (m) => m.GestionSalidas,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'GESTIÓN DE SALIDAS',
      featureKey: 'gestion-administrativa.gestion-salidas',
    },
  },
  {
    // Configuración de Gestión de Rendiciones: los correos que se ORIGINAN acá (las dos
    // decisiones del revisor: primera revisión y reembolso), la VISIBILIDAD de esta bandeja
    // —independiente de la de salidas— y los CONSOLIDADORES, que deciden quién puede adjuntar
    // el Consolidado del S10 por cada trabajador.
    // Va ANTES de 'gestion-rendiciones' para que el segmento 'configuracion' no se lo coma
    // la pantalla.
    path: 'gestion-rendiciones/configuracion',
    loadComponent: () =>
      import('./shared/configuracion/pantalla-configuracion').then(
        (m) => m.GaPantallaConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'GESTIÓN DE RENDICIONES - CONFIGURACIÓN',
      featureKeys: [
        'gestion-administrativa.config.correos',
        'gestion-administrativa.config.visibilidad-rendiciones',
        'gestion-administrativa.config.consolidadores-areas',
      ],
      pantalla: 'gestion-rendiciones',
    },
  },
  {
    path: 'gestion-rendiciones',
    loadComponent: () =>
      import('./features/gestion-rendiciones/components/gestion-rendiciones').then(
        (m) => m.GestionRendiciones,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'GESTIÓN DE RENDICIONES',
      featureKey: 'gestion-administrativa.gestion-rendiciones',
    },
  },
  {
    // Configuración de Reembolsos: los correos que se ORIGINAN acá (hoy ninguno: marcar una
    // planilla como pagada no envía correos).
    // Va ANTES de 'reembolsos' para que el segmento 'configuracion' no se lo coma
    // la pantalla.
    // Misma feature que ya protegía la sección Correos de Configuración: quien administra los
    // correos de salidas los administra todos.
    path: 'reembolsos/configuracion',
    loadComponent: () =>
      import('./shared/configuracion/pantalla-configuracion').then(
        (m) => m.GaPantallaConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'REEMBOLSOS - CONFIGURACIÓN',
      featureKey: 'gestion-administrativa.config.correos',
      pantalla: 'reembolsos',
    },
  },
  {
    path: 'reembolsos',
    loadComponent: () =>
      import('./features/reembolsos/components/reembolsos').then((m) => m.Reembolsos),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'REEMBOLSOS',
      featureKey: 'gestion-administrativa.reembolsos',
    },
  },
  {
    // Configuración de Correcciones S10: el único correo que se origina acá es el aviso al
    // colaborador de que la corrección ya está hecha en el S10.
    // Va ANTES de 'correcciones-s10' para que el segmento 'configuracion' no se lo coma
    // la pantalla.
    path: 'correcciones-s10/configuracion',
    loadComponent: () =>
      import('./shared/configuracion/pantalla-configuracion').then(
        (m) => m.GaPantallaConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CORRECCIONES S10 - CONFIGURACIÓN',
      featureKey: 'gestion-administrativa.config.correos',
      pantalla: 'correcciones-s10',
    },
  },
  {
    // La bandeja del Coordinador ERP. Además del featureKey se exige el ROL: el backend solo
    // responde a COORDINADOR ERP, así que dejar entrar a otro rol le mostraría una pantalla que
    // no le devuelve nada.
    path: 'correcciones-s10',
    loadComponent: () =>
      import('./features/correcciones-s10/components/correcciones-s10').then(
        (m) => m.CorreccionesS10,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CORRECCIONES S10',
      featureKey: 'gestion-administrativa.correcciones-s10',
      roles: [Roles.COORDINADOR_ERP],
    },
  },
  {
    path: 'delegacion-revision',
    loadComponent: () =>
      import('./features/delegacion-revision/components/delegacion-revision').then(
        (m) => m.DelegacionRevision,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'DELEGACIÓN DE REVISIÓN',
      featureKey: 'gestion-administrativa.delegacion-revision',
    },
  },
  // Contenedor de configuración: cada sección conserva su ruta, featureKey y
  // roleGuard, pero todas renderizan GaConfiguracion (que conmuta la sección
  // activa con app-section-tabs a partir de data.seccion).
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
    },
  },
  {
    path: 'configuracion/lugares',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.lugares',
      seccion: 'lugares',
    },
  },
  {
    path: 'configuracion/motivos',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.motivos',
      seccion: 'motivos',
    },
  },
  {
    path: 'configuracion/trayectos',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.trayectos',
      seccion: 'trayectos',
    },
  },
  {
    path: 'configuracion/capturas',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.capturas',
      seccion: 'capturas',
    },
  },
  // Revisores de áreas pasó a Solicitud de Salidas → Configuración (el revisor es a quien se le
  // manda la solicitud que nace ahí). Se mantienen las rutas viejas como redirección para no
  // romper enlaces. La de revisores por trabajador se retiró junto con su pantalla: ese jefe se
  // asigna ahora en el formulario de trabajadores (Gestión de Ingresos).
  {
    path: 'configuracion/revisores-areas',
    redirectTo: 'solicitud-salidas/configuracion',
    pathMatch: 'full',
  },
  // Visibilidad de salidas pasó a Gestión de Salidas → Configuración, que es la bandeja que
  // recorta.
  {
    path: 'configuracion/visibilidad-salidas',
    redirectTo: 'gestion-salidas/configuracion',
    pathMatch: 'full',
  },
  {
    path: 'configuracion/carpeta-adjuntos',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.carpeta-adjuntos',
      seccion: 'carpeta-adjuntos',
    },
  },
  // "Tu firma" no se restringe por featureKey sino por rol: la firma es de la persona, no de una
  // funcionalidad, y la necesita cualquier trabajador de Abril que vaya a firmar algo (el jefe que
  // firma una planilla de rendición, pero también quien firme en otro módulo). USUARIO DE ABRIL
  // (12) es el rol base de todo empleado, así que deja fuera solo a las sesiones que no son de
  // Abril (contratistas y clínica, que tienen su propio flujo de auth).
  {
    path: 'configuracion/firma',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      seccion: 'firma',
      roles: [Roles.USUARIO_DE_ABRIL],
    },
  },
  // La sección Correos de Configuración se dio de baja: los once correos del flujo estaban
  // juntos sin decir de dónde salía cada uno. La ruta se conserva como redirección para no
  // romper enlaces viejos y cae en la primera pantalla del flujo.
  {
    path: 'configuracion/correos',
    redirectTo: 'solicitud-salidas/configuracion',
    pathMatch: 'full',
  },
];
