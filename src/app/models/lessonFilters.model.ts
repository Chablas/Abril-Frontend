import { AreaGetDTO } from "./area.model";
import { ProjectGetDTO } from "./project/project.model";
import { PhaseGetDTO } from "./phase.model";
import { StageGetDTO } from "./stage.model";
import { LayerGetDTO } from "./layer.model";
import { SubStageGetDTO } from "./subStage.model";
import { SubSpecialtyGetDTO } from "./subSpecialty.model";

export interface LessonFiltersDTO {
    projects: ProjectGetDTO[];
    areas: AreaGetDTO[];
    phases: PhaseGetDTO[] | null | undefined;
    stages: StageGetDTO[] | null | undefined;
    layers: LayerGetDTO[] | null | undefined;
    subStages: SubStageGetDTO[] | null | undefined;
    subSpecialties: SubSpecialtyGetDTO[] | null | undefined;
}