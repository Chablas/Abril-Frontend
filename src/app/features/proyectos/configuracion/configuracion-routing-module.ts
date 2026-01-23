import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Areas } from "./pages/areas/areas";
import { ConfFaseEtapaSubetapa } from "./pages/conf-fase-etapa-subetapa/conf-fase-etapa-subetapa";
import { Etapas } from "./pages/etapas/etapas";
import { Fases } from "./pages/fases/fases";
import { Proyectos } from "./pages/proyectos/proyectos";
import { Subetapas } from "./pages/subetapas/subetapas";
import { Subespecialidades } from "./pages/subespecialidades/subespecialidades";

const routes: Routes = [
  { path: "proyectos", component: Proyectos, data: { titulo: 'PROYECTOS' } },
  { path: "areas", component: Areas, data: { titulo: 'ÁREAS' } },
  { path: "etapas", component: Etapas, data: { titulo: 'ETAPAS' } },
  { path: "fases", component: Fases, data: { titulo: 'FASES' } },
  { path: "subetapas", component: Subetapas, data: { titulo: 'SUBETAPAS' } },
  { path: "subespecialidades", component: Subespecialidades, data: { titulo: 'SUBESPECIALIDADES' } },
  { path: "relaciones", component: ConfFaseEtapaSubetapa, data: { titulo: 'RELACIONES' } },
  { path: '', redirectTo: 'proyectos', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfiguracionRoutingModule { }
