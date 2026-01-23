import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LeccionesAprendidas } from "./pages/lecciones-aprendidas/lecciones-aprendidas";
import { Layout } from "../../shared/components/layout/layout";

const routes: Routes = [
  { path: "", component: Layout, children: [
    { path: '', redirectTo: 'lecciones', pathMatch: 'full' },
    { path: "lecciones", children: [
      { path: "", component: LeccionesAprendidas, data: { titulo: 'LECCIONES APRENDIDAS' } }
    ] },
    {
      path: "configuracion", loadChildren: () => {
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
