import { AreaGetDTO } from "./area.model";
import { ProjectGetDTO } from "./project.model";
import { PhaseGetDTO } from "./phase.model";
import { StageGetDTO } from "./stage.model";
import { SubStageGetDTO } from "./subStage.model";
import { SubSpecialtyGetDTO } from "./subSpecialty.model";

export interface PhaseStageSubStageSubSpecialtyShowFormDataDTO {
    areas: AreaGetDTO[];
    projects: ProjectGetDTO[];
    phases: PhaseGetDTO[];
    stages: StageGetDTO[];
    subStages: SubStageGetDTO[];
    subSpecialties: SubSpecialtyGetDTO[];
}