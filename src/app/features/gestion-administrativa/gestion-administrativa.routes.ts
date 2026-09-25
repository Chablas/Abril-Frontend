import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { Roles } from '../../core/constants/roles';

export const GESTION_ADMINISTRATIVA_ROUTES: Routes = [
  { path: '', redirectTo: 'solicitud-salidas', pathMatch: 'full' },
  {
    // Configuración de Solicitud de Salidas: los correos que se ORIGINAN acá (el aviso al
    // revisor y la confirmación al solicitante), el plazo para rendir («Días reembolsables») y
    // los dos recordatorios de ese plazo. Los revisores de cada área ya no viven acá: están en
    // Configuración → Revisores de Áreas, junto con los otros cuatro actores.
    // Va ANTES de 'solicitud-salidas' para que el segmento 'configuracion' no se lo coma
    // la pantalla.
    path: 'solicitud-salidas/configuracion',
    loadComponent: () =>
      import('./shared/configuracion/pantalla-configuracion').then(
        (m) => m.GaPantallaConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'SOLICITUD DE SALIDAS - CONFIGURACIÓN',
      // `featureKeys` (y no `featureKey`) a propósito: el nombre que Seguridad le da a esta feature
      // sale de la ruta de Mis Rendiciones, que es la que la declara sola.
      featureKeys: ['gestion-administrativa.config.correos'],
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
    // Configuración de Gestión de Rendiciones: los correos que se ORIGINAN acá (la decisión de la
    // primera revisión) y la VISIBILIDAD de esta bandeja, independiente de la de salidas.
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
    // Configuración de Consolidados: los correos que se ORIGINAN acá (la decisión del reembolso y
    // el aviso a Tesorería que dispara la firma), la VISIBILIDAD de esta bandeja —aparte de la de
    // rendiciones: ver una planilla y ver su consolidado son dos permisos distintos— y las
    // FIRMAS, que deciden cómo registra la suya quien aprueba acá. Los consolidadores pasaron a
    // Configuración → Revisores de Áreas.
    // Va ANTES de 'consolidados' para que el segmento 'configuracion' no se lo coma la pantalla.
    path: 'consolidados/configuracion',
    loadComponent: () =>
      import('./shared/configuracion/pantalla-configuracion').then(
        (m) => m.GaPantallaConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONSOLIDADOS - CONFIGURACIÓN',
      featureKeys: [
        'gestion-administrativa.config.correos',
        'gestion-administrativa.config.visibilidad-consolidados',
        'gestion-administrativa.config.firmas',
      ],
      pantalla: 'consolidados',
    },
  },
  {
    path: 'consolidados',
    loadComponent: () =>
      import('./features/consolidados/components/consolidados').then((m) => m.Consolidados),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONSOLIDADOS',
      featureKey: 'gestion-administrativa.consolidados',
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
  // Revisores de Áreas: los cinco actores (aprobar la salida, jefe notificado, 1.ª revisión,
  // consolidar, firmar el consolidado) por área y tipo de trabajador. Junta lo que estaba repartido
  // en la configuración de Solicitud de Salidas, Mis Rendiciones y Consolidados. Lo personalizado
  // para UN trabajador se asigna en su ficha (Gestión de Ingresos → Trabajadores).
  {
    path: 'configuracion/revisores-areas',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.revisores-areas',
      seccion: 'revisores-areas',
    },
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
  // "Tu firma" se mudó a Mi Perfil → Mi Firma (2026-09-22): la firma es de la persona, no de una
  // funcionalidad de este módulo. La ruta se conserva como redirección para no romper enlaces
  // viejos; el acceso por rol lo sigue cuidando la ruta de destino.
  { path: 'configuracion/firma', redirectTo: '/mi-perfil/mi-firma' },
  // La sección Correos de Configuración se dio de baja: los once correos del flujo estaban
  // juntos sin decir de dónde salía cada uno. La ruta se conserva como redirección para no
  // romper enlaces viejos y cae en la primera pantalla del flujo.
  {
    path: 'configuracion/correos',
    redirectTo: 'solicitud-salidas/configuracion',
    pathMatch: 'full',
  },
];
