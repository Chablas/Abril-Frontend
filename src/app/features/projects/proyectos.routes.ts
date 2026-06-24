import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { MilestoneSchedule } from './milestone-schedule/milestone-schedule';
import { IvtControl } from './ivt-control/ivt-control';
import { ConstructionLogbookControl } from './construction-logbook-control/construction-logbook-control';
import { ReportResponseControl } from './report-response-control/report-response-control';
import { ResidentMonitoringMeasurement } from './resident-monitoring-measurement/resident-monitoring-measurement';
import { ProjectsDashboard } from './projects-dashboard/projects-dashboard';
import { CronogramaActividades } from './cronograma-actividades/cronograma-actividades';
import { ProyectosCronogramaList } from './cronograma-actividades/proyectos-cronograma-list';

export const PROJECTS_ROUTES: Routes = [
  { path: '', redirectTo: 'projects-dashboard', pathMatch: 'full' },
  {
    path: 'projects-dashboard',
    component: ProjectsDashboard,
    canActivate: [roleGuard],
    data: { titulo: 'DASHBOARD DE PROYECTOS', featureKey: 'projects.projects-dashboard' },
  },
  {
    path: 'cronograma-actividades',
    component: ProyectosCronogramaList,
    canActivate: [roleGuard],
    data: { titulo: 'CRONOGRAMA DE ACTIVIDADES', featureKey: 'projects.cronograma-actividades' },
  },
  {
    path: 'cronograma-actividades/:proyectoId',
    component: CronogramaActividades,
    canActivate: [roleGuard],
    data: { titulo: 'CRONOGRAMA DE ACTIVIDADES', featureKey: 'projects.cronograma-actividades' },
  },
  {
    path: 'milestone-schedule',
    component: MilestoneSchedule,
    canActivate: [roleGuard],
    data: { titulo: 'CRONOGRAMA DE HITOS', featureKey: 'projects.milestone-schedule' },
  },
  {
    path: 'technical-inspection-visit',
    component: IvtControl,
    canActivate: [roleGuard],
    data: { titulo: 'CONTROL DE IVTS', featureKey: 'projects.ivt-control' },
  },
  {
    path: 'construction-logbook',
    component: ConstructionLogbookControl,
    canActivate: [roleGuard],
    data: { titulo: 'CONTROL DE CUADERNO DE OBRA', featureKey: 'projects.construction-logbook' },
  },
  {
    path: 'report-response-control',
    component: ReportResponseControl,
    canActivate: [roleGuard],
    data: { titulo: 'CONTROL DE RESPUESTA DE INFORMES', featureKey: 'projects.report-response-control' },
  },
  {
    path: 'resident-monitoring-measurement',
    component: ResidentMonitoringMeasurement,
    canActivate: [roleGuard],
    data: { titulo: 'SEGUIMIENTO Y MEDICIÓN DE RESIDENTES POR PROYECTO', featureKey: 'projects.resident-monitoring-measurement' },
  },
  {
    path: 'configuration',
    loadChildren: () =>
      import('./configuration/configuracion-module').then((x) => x.ConfiguracionModule),
  },
];
