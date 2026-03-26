import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Adjudicaciones } from './adjudicaciones/adjudicaciones';
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
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule, Adjudicaciones],
  exports: [RouterModule],
})
export class CostsModule {}
