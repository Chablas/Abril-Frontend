import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LeccionesAprendidas } from './lecciones-aprendidas/lecciones-aprendidas';
import { LessonsDashboard } from './lessons-dashboard/lessons-dashboard';
import { MilestoneSchedule } from './milestone-schedule/milestone-schedule';
import { IvtControl } from '../projects/ivt-control/ivt-control';
import { ConstructionLogbookControl } from '../projects/construction-logbook-control/construction-logbook-control';
import { ReportResponseControl } from './report-response-control/report-response-control';
import { roleGuard } from '../../core/guards/role.guard';
import { ResidentMonitoringMeasurement } from './resident-monitoring-measurement/resident-monitoring-measurement';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'lessons', pathMatch: 'full' },
      {
        path: 'lessons',
        children: [
          {
            path: '',
            component: LeccionesAprendidas,
            canActivate: [roleGuard],
            data: {
              titulo: 'LECCIONES APRENDIDAS',
              roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
            },
          },
        ],
      },
      {
        path: 'dashboard',
        children: [
          {
            path: '',
            component: LessonsDashboard,
            canActivate: [roleGuard],
            data: {
              titulo: 'DASHBOARD DE LECCIONES APRENDIDAS',
              roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
            },
          },
        ],
      },
      {
        path: 'milestone-schedule',
        children: [
          {
            path: '',
            component: MilestoneSchedule,
            canActivate: [roleGuard],
            data: {
              titulo: 'CRONOGRAMA DE HITOS',
              roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES'],
            },
          },
        ],
      },
      {
        path: 'technical-inspection-visit',
        children: [
          {
            path: '',
            canActivate: [roleGuard],
            component: IvtControl,
            data: {
              titulo: 'CONTROL DE IVTS',
              roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES'],
            },
          },
        ],
      },
      {
        path: 'construction-logbook',
        children: [
          {
            path: '',
            canActivate: [roleGuard],
            component: ConstructionLogbookControl,
            data: {
              titulo: 'CONTROL DE CUADERNO DE OBRA',
              roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES'],
            },
          },
        ],
      },
      {
        path: 'report-response-control',
        children: [
          {
            path: '',
            component: ReportResponseControl,
            canActivate: [roleGuard],
            data: {
              titulo: 'CONTROL DE RESPUESTA DE INFORMES',
              roles: ['RESIDENTE', 'ADMINISTRADOR DE RESIDENTES'],
            },
          },
        ],
      },
      {
        path: 'resident-monitoring-measurement',
        children: [
          {
            path: '',
            component: ResidentMonitoringMeasurement,
            canActivate: [roleGuard],
            data: {
              titulo: 'SEGUIMIENTO Y MEDICIÓN DE RESIDENTES POR PROYECTO',
              roles: ['ADMINISTRADOR DE RESIDENTES'],
            },
          },
        ],
      },
      {
        path: 'configuration',
        loadChildren: () => {
          return import('./configuration/configuracion-module').then((x) => x.ConfiguracionModule);
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProyectosRoutingModule {}
