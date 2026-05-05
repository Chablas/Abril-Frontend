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
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP', 'CONTRATISTA'],
    },
  },
  {
    path: 'empresa',
    loadComponent: () => import('./pages/empresa/empresa').then((m) => m.Empresa),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - EMPRESA',
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'],
    },
  },
  {
    path: 'equipos',
    loadComponent: () => import('./pages/equipos/equipos').then((m) => m.Equipos),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - EQUIPOS Y MÁQUINAS',
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'],
    },
  },
  {
    path: 'bandeja',
    loadComponent: () => import('./pages/bandeja/bandeja').then((m) => m.Bandeja),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - BANDEJA DE APROBACIONES',
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'],
    },
  },
  {
    path: 'sctr-vidaley',
    loadComponent: () =>
      import('./pages/sctr-vidaley/sctr-vidaley').then((m) => m.SctrVidaley),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - SCTR Y VIDA LEY',
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'],
    },
  },
  {
    path: 'inducciones',
    loadComponent: () =>
      import('./pages/inducciones/inducciones').then((m) => m.Inducciones),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - INDUCCIONES',
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP', 'CONTRATISTA'],
    },
  },
  {
    path: 'registros-modelo',
    loadComponent: () =>
      import('./pages/registros-modelo/registros-modelo').then((m) => m.RegistrosModelo),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - REGISTROS MODELO',
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP', 'CONTRATISTA'],
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
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'],
    },
  },
  {
    path: 'auditoria',
    loadComponent: () => import('./pages/auditoria/auditoria').then((m) => m.Auditoria),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - AUDITORÍA',
      roles: ['ADMINISTRADOR SSOMA'],
    },
  },
  {
    path: 'reglas',
    loadComponent: () => import('./pages/reglas/reglas').then((m) => m.Reglas),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - REGLAS DE ENTREGABLES',
      roles: ['ADMINISTRADOR SSOMA'],
    },
  },
  {
    path: 'control-acceso',
    loadComponent: () =>
      import('./pages/control-acceso/control-acceso').then((m) => m.ControlAcceso),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'HABILITACIÓN - CONTROL DE ACCESO',
      roles: ['ADMINISTRADOR SSOMA', 'ADMINISTRADOR DE UDP'],
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
