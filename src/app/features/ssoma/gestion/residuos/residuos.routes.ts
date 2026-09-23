import { Routes } from '@angular/router';
import { roleGuard } from '../../../../core/guards/role.guard';

export const RESIDUOS_ROUTES: Routes = [
  { path: '', redirectTo: 'tipos', pathMatch: 'full' },
  {
    path: 'tipos',
    loadComponent: () =>
      import('./tipos/pages/lista/tipo-residuo-lista').then((m) => m.TipoResiduoLista),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.tipos' },
  },
  {
    path: 'eo-rs',
    loadComponent: () => import('./eo-rs/pages/lista/eo-rs-lista').then((m) => m.EoRsLista),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.eo-rs' },
  },
  {
    path: 'autorizaciones-dme',
    loadComponent: () =>
      import('./autorizaciones-dme/pages/lista/autorizacion-dme-lista').then(
        (m) => m.AutorizacionDmeLista,
      ),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.autorizaciones-dme' },
  },
  {
    path: 'viajes',
    loadComponent: () => import('./viajes/pages/lista/viaje-lista').then((m) => m.ViajeLista),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.viajes' },
  },
  {
    path: 'declaraciones',
    loadComponent: () =>
      import('./declaraciones/pages/lista/declaracion-lista').then((m) => m.DeclaracionLista),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.declaraciones' },
  },
  {
    path: 'declaraciones/:id',
    loadComponent: () =>
      import('./declaraciones/pages/detalle/declaracion-detalle').then(
        (m) => m.DeclaracionDetalle,
      ),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.declaraciones' },
  },
  {
    path: 'constancias',
    loadComponent: () =>
      import('./constancias/pages/lista/constancia-lista').then((m) => m.ConstanciaLista),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.constancias' },
  },
  {
    path: 'constancias-finales',
    loadComponent: () =>
      import('./constancias-finales/pages/lista/constancia-final-lista').then(
        (m) => m.ConstanciaFinalLista,
      ),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.constancias-finales' },
  },
  {
    path: 'documentos-referencia',
    loadComponent: () =>
      import('./documentos-referencia/pages/lista/documento-referencia-lista').then(
        (m) => m.DocumentoReferenciaLista,
      ),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.residuos.documentos-referencia' },
  },
];
