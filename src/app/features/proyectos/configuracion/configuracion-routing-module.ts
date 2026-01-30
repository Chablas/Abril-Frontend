import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Areas } from "./pages/areas/areas";
import { ConfFaseEtapaSubetapa } from "./pages/conf-fase-etapa-subetapa/conf-fase-etapa-subetapa";
import { Etapas } from "./pages/etapas/etapas";
import { Fases } from "./pages/fases/fases";
import { Proyectos } from "./pages/proyectos/proyectos";
import { Subetapas } from "./pages/subetapas/subetapas";
import { Subespecialidades } from "./pages/subespecialidades/subespecialidades";
import { Layers } from "./pages/layers/layers";

const routes: Routes = [
  { path: "projects", component: Proyectos, data: { titulo: 'PROYECTOS' } },
  { path: "areas", component: Areas, data: { titulo: 'ÁREAS' } },
  { path: "stages", component: Etapas, data: { titulo: 'ETAPAS' } },
  { path: "layers", component: Layers, data: { titulo: 'NIVELES' } },
  { path: "phases", component: Fases, data: { titulo: 'FASES' } },
  { path: "sub-stages", component: Subetapas, data: { titulo: 'SUBETAPAS' } },
  { path: "sub-specialties", component: Subespecialidades, data: { titulo: 'SUBESPECIALIDADES' } },
  { path: "relations", component: ConfFaseEtapaSubetapa, data: { titulo: 'RELACIONES' } },
  { path: '', redirectTo: 'projects', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfiguracionRoutingModule { }
