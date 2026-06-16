import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Adjudicaciones } from './features/adjudicaciones/components/adjudicaciones';
import { AdjudicacionesDashboard } from './features/adjudicaciones-dashboard/components/adjudicaciones-dashboard';
import { StaffProjectEmail } from './features/configuration/staffProjectEmail/components/staff-project-email';
import { WorkItemCategory } from './features/configuration/workItemCategory/components/work-item-category';
import { WorkItem } from './features/configuration/workItem/components/work-item';
import { WorkSpecialty } from './features/configuration/workSpecialty/components/work-specialty';
import { ProjectLink } from './features/configuration/projectLink/components/project-link';
import { AdjudicacionFolder } from './features/configuration/adjudicacionFolder/components/adjudicacion-folder';
import { CostosPresupuestosEmail } from './features/configuration/costosPresupuestosEmail/components/costos-presupuestos-email';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'adjudicaciones', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: AdjudicacionesDashboard,
        canActivate: [roleGuard],
        data: { titulo: 'DASHBOARD DE ADJUDICACIONES', featureKey: 'costs.dashboard' },
      },
      {
        path: 'adjudicaciones',
        children: [
          {
            path: '',
            component: Adjudicaciones,
            canActivate: [roleGuard],
            data: { titulo: 'ADJUDICACIONES DE SC', featureKey: 'costs.adjudicaciones' },
          },
        ],
      },
      {
        path: 'configuration',
        children: [
          {
            path: 'staff-project-email',
            component: StaffProjectEmail,
            canActivate: [roleGuard],
            data: { titulo: 'CORREOS POR PROYECTO', featureKey: 'costs.config.staff-project-email' },
          },
          {
            path: 'work-item-category',
            component: WorkItemCategory,
            canActivate: [roleGuard],
            data: { titulo: 'PARTIDAS DE CONTROL', featureKey: 'costs.config.work-item-category' },
          },
          {
            path: 'work-item',
            component: WorkItem,
            canActivate: [roleGuard],
            data: { titulo: 'PARTIDAS', featureKey: 'costs.config.work-item' },
          },
          {
            path: 'work-specialty',
            component: WorkSpecialty,
            canActivate: [roleGuard],
            data: { titulo: 'ESPECIALIDADES', featureKey: 'costs.config.work-specialty' },
          },
          {
            path: 'project-link',
            component: ProjectLink,
            canActivate: [roleGuard],
            data: { titulo: 'PLANOS POR PROYECTO', featureKey: 'costs.config.project-link' },
          },
          {
            path: 'adjudicacion-folder',
            component: AdjudicacionFolder,
            canActivate: [roleGuard],
            data: { titulo: 'CARPETAS DE ADJUDICACIONES', featureKey: 'costs.config.adjudicacion-folder' },
          },
          {
            path: 'costos-presupuestos-email',
            component: CostosPresupuestosEmail,
            canActivate: [roleGuard],
            data: { titulo: 'CORREOS C. Y PRESUPUESTOS', featureKey: 'costs.config.costos-presupuestos-email' },
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule],
  exports: [RouterModule],
})
export class CostsModule {}
