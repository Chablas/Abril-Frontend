import { Routes } from '@angular/router';

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
    data: { titulo: 'HOMOLOGACIÓN DE CONTRATISTAS', roles: ['USUARIO DE COSTOS Y PRESUPUESTOS'] },
  }
];