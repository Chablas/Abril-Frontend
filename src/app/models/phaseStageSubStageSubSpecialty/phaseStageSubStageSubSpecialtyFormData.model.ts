import { AreaGetDTO } from "../area/area.model";
import { ProjectGetDTO } from "../project/project.model";
import { PhaseGetDTO } from "../phase/phase.model";
import { StageGetDTO } from "../stage/stage.model";
import { SubStageGetDTO } from "../subStage/subStage.model";
import { SubSpecialtyGetDTO } from "../subSpecialty/subSpecialty.model";
import { LayerGetDTO } from "../layer/layer.model";

export interface PhaseStageSubStageSubSpecialtyShowFormDataDTO {
    areas: AreaGetDTO[];
    projects: ProjectGetDTO[];
    phases: PhaseGetDTO[];
    stages: StageGetDTO[];
    layers: LayerGetDTO[];
    subStages: SubStageGetDTO[];
    subSpecialties: SubSpecialtyGetDTO[];
}