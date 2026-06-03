import { Routes } from '@angular/router';
import { roleGuard } from '../../../../core/guards/role.guard';
import { PasoDashboardComponent } from './pages/dashboard/paso-dashboard.component';
import { PasoListaComponent } from './pages/lista/paso-lista.component';
import { PasoDetalleComponent } from './pages/detalle/paso-detalle.component';
import { PasoActividadDetalleComponent } from './pages/actividad-detalle/paso-actividad-detalle.component';
import { PasoAlertasComponent } from './pages/alertas/paso-alertas.component';

export const PASO_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: PasoDashboardComponent,
    canActivate: [roleGuard],
    data: { titulo: 'PASO - DASHBOARD', featureKey: 'ssoma.gestion.paso.dashboard' },
  },
  {
    path: 'lista',
    component: PasoListaComponent,
    canActivate: [roleGuard],
    data: { titulo: 'PASO - PROGRAMAS', featureKey: 'ssoma.gestion.paso.lista' },
  },
  {
    path: 'alertas',
    component: PasoAlertasComponent,
    canActivate: [roleGuard],
    data: { titulo: 'PASO - ALERTAS', featureKey: 'ssoma.gestion.paso.alertas' },
  },
  {
    path: 'actividad/:id',
    component: PasoActividadDetalleComponent,
    canActivate: [roleGuard],
    data: { titulo: 'PASO - ACTIVIDAD', featureKey: 'ssoma.gestion.paso.lista' },
  },
  {
    path: ':id',
    component: PasoDetalleComponent,
    canActivate: [roleGuard],
    data: { titulo: 'PASO - DETALLE', featureKey: 'ssoma.gestion.paso.lista' },
  },
];
