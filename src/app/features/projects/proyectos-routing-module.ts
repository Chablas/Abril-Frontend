import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MilestoneSchedule } from './milestone-schedule/milestone-schedule';
import { IvtControl } from '../projects/ivt-control/ivt-control';
import { ConstructionLogbookControl } from '../projects/construction-logbook-control/construction-logbook-control';
import { ReportResponseControl } from './report-response-control/report-response-control';
import { roleGuard } from '../../core/guards/role.guard';
import { ResidentMonitoringMeasurement } from './resident-monitoring-measurement/resident-monitoring-measurement';
import { ProjectsDashboard } from './projects-dashboard/projects-dashboard';
import { CronogramaActividades } from './cronograma-actividades/cronograma-actividades';
import { ProyectosCronogramaList } from './cronograma-actividades/proyectos-cronograma-list';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'projects-dashboard', pathMatch: 'full' },
      {
        path: 'projects-dashboard',
        children: [
          {
            path: '',
            component: ProjectsDashboard,
            canActivate: [roleGuard],
            data: {
              titulo: 'DASHBOARD DE PROYECTOS',
              roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
              featureKey: 'projects.projects-dashboard',
            },
          },
        ],
      },
      {
        path: 'cronograma-actividades',
        children: [
          {
            path: '',
            component: ProyectosCronogramaList,
            canActivate: [roleGuard],
            data: {
              titulo: 'CRONOGRAMA DE ACTIVIDADES',
              roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
              featureKey: 'projects.cronograma-actividades',
            },
          },
          {
            path: ':proyectoId',
            component: CronogramaActividades,
            canActivate: [roleGuard],
            data: {
              titulo: 'CRONOGRAMA DE ACTIVIDADES',
              roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP'],
              featureKey: 'projects.cronograma-actividades',
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
            data: { titulo: 'CRONOGRAMA DE HITOS', featureKey: 'projects.milestone-schedule' },
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
            data: { titulo: 'CONTROL DE IVTS', featureKey: 'projects.ivt-control' },
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
            data: { titulo: 'CONTROL DE CUADERNO DE OBRA', featureKey: 'projects.construction-logbook' },
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
            data: { titulo: 'CONTROL DE RESPUESTA DE INFORMES', featureKey: 'projects.report-response-control' },
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
            data: { titulo: 'SEGUIMIENTO Y MEDICIÓN DE RESIDENTES POR PROYECTO', featureKey: 'projects.resident-monitoring-measurement' },
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
