import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LeccionesAprendidas } from "./pages/lecciones-aprendidas/lecciones-aprendidas";
import { LessonsDashboard } from "./pages/lessons-dashboard/lessons-dashboard";
import { MilestoneSchedule } from "./pages/milestone-schedule/milestone-schedule";
import { Layout } from "../../shared/components/layout/layout";

const routes: Routes = [
  { path: "", component: Layout, children: [
    { path: '', redirectTo: 'lessons', pathMatch: 'full' },
    { path: "lessons", children: [
      { path: "", component: LeccionesAprendidas, data: { titulo: 'LECCIONES APRENDIDAS' } }
    ] },
    { path: "dashboard", children: [
      { path: "", component: LessonsDashboard, data: { titulo: 'DASHBOARD DE LECCIONES APRENDIDAS' } }
    ] },
    { path: "milestone-schedule", children: [
      { path: "", component: MilestoneSchedule, data: { titulo: 'CRONOGRAMA DE HITOS' } }
    ] },
    {
      path: "configuration", loadChildren: () => {
        return import("./configuration/configuracion-module").then(x => x.ConfiguracionModule)
      }
    }
  ] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProyectosRoutingModule { }
