import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Areas } from "./pages/areas/areas";
import { ConfFaseEtapaSubetapa } from "./pages/conf-fase-etapa-subetapa/conf-fase-etapa-subetapa";
import { Etapas } from "./pages/etapas/etapas";
import { Fases } from "./pages/fases/fases";
import { Subetapas } from "./pages/subetapas/subetapas";
import { Subespecialidades } from "./pages/subespecialidades/subespecialidades";
import { Reminder } from "./pages/reminder/reminder";
import { Layers } from "./pages/layers/layers";
import { Milestones } from "./pages/milestones/milestones";
import { roleGuard } from '../../../core/guards/role.guard';

const routes: Routes = [
  { path: "areas", component: Areas, canActivate: [roleGuard], data: { titulo: 'ÁREAS', roles: ['ADMINISTRADOR DE UDP'] } },
  { path: "stages", component: Etapas, canActivate: [roleGuard], data: { titulo: 'ETAPAS', roles: ['ADMINISTRADOR DE UDP'] } },
  { path: "layers", component: Layers, canActivate: [roleGuard], data: { titulo: 'NIVELES', roles: ['ADMINISTRADOR DE UDP'] } },
  { path: "phases", component: Fases, canActivate: [roleGuard], data: { titulo: 'FASES', roles: ['ADMINISTRADOR DE UDP'] } },
  { path: "sub-stages", component: Subetapas, canActivate: [roleGuard], data: { titulo: 'SUBETAPAS', roles: ['ADMINISTRADOR DE UDP'] } },
  { path: "sub-specialties", component: Subespecialidades, canActivate: [roleGuard], data: { titulo: 'SUBESPECIALIDADES', roles: ['ADMINISTRADOR DE UDP'] } },
  { path: "relations", component: ConfFaseEtapaSubetapa, canActivate: [roleGuard], data: { titulo: 'RELACIONES', roles: ['ADMINISTRADOR DE UDP'] } },
  { path: "reminders", component: Reminder, canActivate: [roleGuard], data: { titulo: 'RECORDATORIOS DE LECCIONES', roles: ['ADMINISTRADOR DE UDP'] } },
  { path: "milestones", component: Milestones, canActivate: [roleGuard], data: { titulo: 'HITOS', roles: ['ADMINISTRADOR DE RESIDENTES'] } },
  { path: '', redirectTo: 'areas', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfiguracionRoutingModule { }
