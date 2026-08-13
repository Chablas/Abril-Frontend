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
