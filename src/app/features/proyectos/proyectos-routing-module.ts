import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LeccionesAprendidas } from "./pages/lecciones-aprendidas/lecciones-aprendidas";
import { LessonsDashboard } from "./pages/lessons-dashboard/lessons-dashboard";
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
    {
      path: "configuration", loadChildren: () => {
        return import("./configuracion/configuracion-module").then(x => x.ConfiguracionModule)
      }
    }
  ] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProyectosRoutingModule { }
