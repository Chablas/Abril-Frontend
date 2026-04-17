import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Adjudicaciones } from './features/adjudicaciones/components/adjudicaciones';
import { StaffProjectEmail } from './features/configuration/staffProjectEmail/components/staff-project-email';
import { WorkItemCategory } from './features/configuration/workItemCategory/components/work-item-category';
import { WorkItem } from './features/configuration/workItem/components/work-item';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'adjudicaciones', pathMatch: 'full' },
      {
        path: 'adjudicaciones',
        children: [
          {
            path: '',
            component: Adjudicaciones,
            canActivate: [roleGuard],
            data: { titulo: 'ADJUDICACIONES DE SC', roles: ['ADMINISTRADOR DEL SISTEMA'] },
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
            data: { titulo: 'CORREOS POR PROYECTO', roles: ['ADMINISTRADOR DEL SISTEMA'] },
          },
          {
            path: 'work-item-category',
            component: WorkItemCategory,
            canActivate: [roleGuard],
            data: { titulo: 'PARTIDAS DE CONTROL', roles: ['ADMINISTRADOR DEL SISTEMA'] },
          },
          {
            path: 'work-item',
            component: WorkItem,
            canActivate: [roleGuard],
            data: { titulo: 'PARTIDAS', roles: ['ADMINISTRADOR DEL SISTEMA'] },
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
