import { AreaGetDTO } from "./area.model";
import { ProjectGetDTO } from "./project.model";
import { PhaseGetDTO } from "./phase.model";
import { StageGetDTO } from "./stage.model";
import { SubStageGetDTO } from "./subStage.model";
import { SubSpecialtyGetDTO } from "./subSpecialty.model";
import { LayerGetDTO } from "./layer.model";

export interface PhaseStageSubStageSubSpecialtyShowFormDataDTO {
    areas: AreaGetDTO[];
    projects: ProjectGetDTO[];
    phases: PhaseGetDTO[];
    stages: StageGetDTO[];
    layers: LayerGetDTO[];
    subStages: SubStageGetDTO[];
    subSpecialties: SubSpecialtyGetDTO[];
}