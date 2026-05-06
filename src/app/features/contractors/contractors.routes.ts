import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

/** Rutas públicas (sin layout) — registro de contratistas externos */
export const CONTRACTORS_ROUTES: Routes = [
  {
    path: 'registro',
    loadComponent: () =>
      import('./contractor-registration/components/contractor-registration')
      .then(m => m.ContractorRegistration)
  }
];

/** Rutas protegidas (dentro del layout con auth) — gestión interna */
export const CONTRACTORS_ADMIN_ROUTES: Routes = [
  {
    path: 'management',
    loadComponent: () =>
      import('./contractor-management/components/contractor-management')
      .then(m => m.ContractorManagement),
    canActivate: [roleGuard],
    data: { titulo: 'HOMOLOGACIÓN DE CONTRATISTAS', featureKey: 'contractors.management' },
  }
];