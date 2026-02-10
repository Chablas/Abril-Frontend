import { AreaGetDTO } from "../area/area.model";
import { ProjectGetDTO } from "../project/project.model";
import { PhaseGetDTO } from "../phase/phase.model";
import { StageGetDTO } from "../stage/stage.model";
import { LayerGetDTO } from "../layer/layer.model";
import { SubStageGetDTO } from "../subStage/subStage.model";
import { SubSpecialtyGetDTO } from "../subSpecialty/subSpecialty.model";

export interface LessonFiltersDTO {
    projects: ProjectGetDTO[];
    areas: AreaGetDTO[];
    phases: PhaseGetDTO[] | null | undefined;
    stages: StageGetDTO[] | null | undefined;
    layers: LayerGetDTO[] | null | undefined;
    subStages: SubStageGetDTO[] | null | undefined;
    subSpecialties: SubSpecialtyGetDTO[] | null | undefined;
}