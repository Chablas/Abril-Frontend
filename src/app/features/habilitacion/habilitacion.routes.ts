import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const HABILITACION_ROUTES: Routes = [
  { path: '', redirectTo: 'trabajadores', pathMatch: 'full' },
  {
    path: 'trabajadores',
    loadComponent: () =>
      import('./pages/trabajadores/trabajadores').then((m) => m.Trabajadores),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - TRABAJADORES',
      featureKey: 'habilitacion.trabajadores',
      roles: ['CONTRATISTA'],
    },
  },
  {
    path: 'empresa',
    loadComponent: () => import('./pages/empresa/empresa').then((m) => m.Empresa),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - EMPRESA',
      featureKey: 'habilitacion.empresa',
    },
  },
  {
    path: 'equipos',
    loadComponent: () => import('./pages/equipos/equipos').then((m) => m.Equipos),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - EQUIPOS Y MÁQUINAS',
      featureKey: 'habilitacion.equipos',
    },
  },
  {
    path: 'bandeja',
    loadComponent: () => import('./pages/bandeja/bandeja').then((m) => m.Bandeja),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - BANDEJA DE APROBACIONES',
      featureKey: 'habilitacion.bandeja',
    },
  },
  {
    path: 'sctr-vidaley',
    loadComponent: () =>
      import('./pages/sctr-vidaley/sctr-vidaley').then((m) => m.SctrVidaley),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - SCTR Y VIDA LEY',
      featureKey: 'habilitacion.sctr-vidaley',
    },
  },
  {
    path: 'inducciones',
    loadComponent: () =>
      import('./pages/inducciones/inducciones').then((m) => m.Inducciones),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - INDUCCIONES',
      featureKey: 'habilitacion.inducciones',
      roles: ['CONTRATISTA'],
    },
  },
  {
    path: 'registros-modelo',
    loadComponent: () =>
      import('./pages/registros-modelo/registros-modelo').then((m) => m.RegistrosModelo),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - REGISTROS MODELO',
      featureKey: 'habilitacion.registros-modelo',
      roles: ['CONTRATISTA'],
    },
  },
  {
    path: 'evaluacion-supervisores',
    loadComponent: () =>
      import('./pages/evaluacion-supervisores/evaluacion-supervisores').then(
        (m) => m.EvaluacionSupervisores,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - EVALUACIÓN SUPERVISORES',
      featureKey: 'habilitacion.evaluacion-supervisores',
    },
  },
  {
    path: 'auditoria',
    loadComponent: () => import('./pages/auditoria/auditoria').then((m) => m.Auditoria),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - AUDITORÍA',
      featureKey: 'habilitacion.auditoria',
    },
  },
  {
    path: 'reglas',
    loadComponent: () => import('./pages/reglas/reglas').then((m) => m.Reglas),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - REGLAS DE ENTREGABLES',
      featureKey: 'habilitacion.reglas',
    },
  },
  {
    path: 'cambiar-password',
    loadComponent: () =>
      import('./pages/cambiar-password/cambiar-password').then((m) => m.CambiarPassword),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CAMBIAR CONTRASEÑA',
      roles: ['CONTRATISTA'],
    },
  },
];
