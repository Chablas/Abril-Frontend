import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const GESTION_GTH_ROUTES: Routes = [
  { path: '', redirectTo: 'reclutamiento', pathMatch: 'full' },
  {
    // Vista de GTH: bandeja de solicitudes de contratación de toda la organización.
    path: 'reclutamiento',
    loadComponent: () =>
      import('./reclutamiento/reclutamiento').then((m) => m.GthReclutamiento),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'RECLUTAMIENTO',
      featureKey: 'gestion-gth.reclutamiento',
    },
  },
  {
    // Configuración de los correos que salen desde la bandeja de GTH (long list enviada y aviso
    // de formulario del postulante completado). Misma feature que el botón «Configuración».
    path: 'reclutamiento/configuracion',
    loadComponent: () =>
      import('./reclutamiento/configuracion/reclutamiento-configuracion').then(
        (m) => m.GthReclutamientoConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'RECLUTAMIENTO - CONFIGURACIÓN',
      featureKey: 'gestion-gth.reclutamiento.configuracion',
    },
  },
  {
    // Misma bandeja de GTH, con el detalle de un requerimiento ya abierto: es la URL del botón
    // del correo de decisión de long list. El modal de detalle se acomoda solo a la fase, así
    // que el enlace sirve tanto para continuar el proceso como para cargar una nueva long list.
    // Segmento propio ('requerimiento') para que no compita con 'reclutamiento/configuracion'.
    path: 'reclutamiento/requerimiento/:id',
    loadComponent: () =>
      import('./reclutamiento/reclutamiento').then((m) => m.GthReclutamiento),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'RECLUTAMIENTO',
      featureKey: 'gestion-gth.reclutamiento',
    },
  },
  {
    // Onboarding: la fase que sigue a Reclutamiento. Solo entran los candidatos que el área
    // solicitante seleccionó y cuyo requerimiento quedó cerrado.
    path: 'onboarding',
    loadComponent: () => import('./onboarding/onboarding').then((m) => m.GthOnboarding),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'ONBOARDING',
      featureKey: 'gestion-gth.onboarding',
    },
  },
  {
    // Vista del solicitante (jefatura/gerencia): registra y hace seguimiento a sus vacantes.
    path: 'solicitud-personal',
    loadComponent: () =>
      import('./solicitud-personal/solicitud-personal').then((m) => m.GthSolicitudPersonal),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'SOLICITUD DE PERSONAL',
      featureKey: 'gestion-gth.solicitud-personal',
    },
  },
  {
    // Vista de Gerencia: aprueba o rechaza las solicitudes de personal y deja el
    // historial de decisiones. Reemplaza a la antigua página pública por token.
    path: 'aprobaciones',
    loadComponent: () => import('./aprobaciones/aprobaciones').then((m) => m.GthAprobaciones),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'APROBACIONES',
      featureKey: 'gestion-gth.aprobaciones',
    },
  },
  {
    // Configuración del correo que dispara la decisión de Gerencia (el aviso a GTH con las
    // vacantes aprobadas). Va ANTES de 'aprobaciones/:id' porque ese comodín también matchea
    // 'configuracion' y se quedaría con la ruta. Misma feature que las otras dos
    // configuraciones de correos del módulo.
    path: 'aprobaciones/configuracion',
    loadComponent: () =>
      import('./aprobaciones/configuracion/aprobaciones-configuracion').then(
        (m) => m.GthAprobacionesConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'APROBACIONES - CONFIGURACIÓN',
      featureKey: 'gestion-gth.reclutamiento.configuracion',
    },
  },
  {
    // Misma pantalla, con una solicitud abierta: es la URL del enlace del correo a
    // Gerencia. Si no hay sesión, el authGuard manda al login con esta URL como
    // returnUrl y el login devuelve al usuario justo acá.
    path: 'aprobaciones/:id',
    loadComponent: () => import('./aprobaciones/aprobaciones').then((m) => m.GthAprobaciones),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'APROBACIONES',
      featureKey: 'gestion-gth.aprobaciones',
    },
  },
  {
    // Misma pantalla del solicitante, con la long list de un requerimiento ya abierta: es la URL
    // del botón «Revisar long list y CVs» del correo que GTH le envía. Si no hay sesión, el
    // authGuard manda al login con esta URL como returnUrl y el login devuelve al usuario acá.
    // Va con un segmento propio ('long-list') y no como 'solicitud-personal/:id' para que no
    // compita con 'solicitud-personal/configuracion'.
    path: 'solicitud-personal/long-list/:id',
    loadComponent: () =>
      import('./solicitud-personal/solicitud-personal').then((m) => m.GthSolicitudPersonal),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'SOLICITUD DE PERSONAL',
      featureKey: 'gestion-gth.solicitud-personal',
    },
  },
  {
    // Configuración de los correos del flujo: qué correos se envían y a quién.
    // Misma feature que ya habilitaba el botón «Configuración» de la pantalla anterior.
    path: 'solicitud-personal/configuracion',
    loadComponent: () =>
      import('./solicitud-personal/configuracion/solicitud-personal-configuracion').then(
        (m) => m.GthSolicitudPersonalConfiguracion,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'SOLICITUD DE PERSONAL - CONFIGURACIÓN',
      featureKey: 'gestion-gth.reclutamiento.configuracion',
    },
  },
];
