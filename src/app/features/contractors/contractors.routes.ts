import { Routes } from '@angular/router';

export const CONTRACTORS_ROUTES: Routes = [
  {
    path: 'registro',
    loadComponent: () =>
      import('./contractor-registration/components/contractor-registration')
      .then(m => m.ContractorRegistration)
  }
];
