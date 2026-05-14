import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfFaseEtapaSubetapa } from './pages/conf-fase-etapa-subetapa/conf-fase-etapa-subetapa';
import { Etapas } from './pages/etapas/etapas';
import { Fases } from './pages/fases/fases';
import { Subetapas } from './pages/subetapas/subetapas';
import { Subespecialidades } from './pages/subespecialidades/subespecialidades';
import { Reminder } from './pages/reminder/reminder';
import { Layers } from './pages/layers/layers';
import { Milestones } from './pages/milestones/milestones';
import { roleGuard } from '../../../core/guards/role.guard';

const routes: Routes = [
  { path: 'stages',          component: Etapas,                 canActivate: [roleGuard], data: { titulo: 'ETAPAS',                       featureKey: 'projects.config.stages' } },
  { path: 'layers',          component: Layers,                 canActivate: [roleGuard], data: { titulo: 'NIVELES',                      featureKey: 'projects.config.layers' } },
  { path: 'phases',          component: Fases,                  canActivate: [roleGuard], data: { titulo: 'FASES',                        featureKey: 'projects.config.phases' } },
  { path: 'sub-stages',      component: Subetapas,              canActivate: [roleGuard], data: { titulo: 'SUBETAPAS',                    featureKey: 'projects.config.sub-stages' } },
  { path: 'sub-specialties', component: Subespecialidades,      canActivate: [roleGuard], data: { titulo: 'SUBESPECIALIDADES',            featureKey: 'projects.config.sub-specialties' } },
  { path: 'relations',       component: ConfFaseEtapaSubetapa,  canActivate: [roleGuard], data: { titulo: 'RELACIONES',                   featureKey: 'projects.config.relations' } },
  { path: 'reminders',       component: Reminder,               canActivate: [roleGuard], data: { titulo: 'RECORDATORIOS DE LECCIONES',   featureKey: 'projects.config.reminders' } },
  { path: 'milestones',      component: Milestones,             canActivate: [roleGuard], data: { titulo: 'HITOS',                        featureKey: 'projects.config.milestones' } },
  { path: '', redirectTo: 'stages', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfiguracionRoutingModule {}
