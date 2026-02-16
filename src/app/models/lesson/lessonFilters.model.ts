import { AreaSimpleDTO } from "../area/areaSimple.model";
import { ProjectSimpleDTO } from "../project/projectSimple.model";
import { LessonPeriodDTO } from "../lesson/lessonPeriodDTO.model";
import { PhaseSimpleDTO } from "../phase/phaseSimple.model";
import { StageSimpleDTO } from "../stage/stageSimple.model";
import { LayerSimpleDTO } from "../layer/layerSimple.model";
import { SubStageSimpleDTO } from "../subStage/subStageSimple.model";
import { UserSimpleDTO } from "../user/userSimple.model";
import { SubSpecialtySimpleDTO } from "../subSpecialty/subSpecialtySimple.model";

export interface LessonFiltersDTO {
    projects: ProjectSimpleDTO[];
    areas: AreaSimpleDTO[];
    periods: LessonPeriodDTO[];
    phases: PhaseSimpleDTO[] | null | undefined;
    stages: StageSimpleDTO[] | null | undefined;
    layers: LayerSimpleDTO[] | null | undefined;
    subStages: SubStageSimpleDTO[] | null | undefined;
    subSpecialties: SubSpecialtySimpleDTO[] | null | undefined;
    users: UserSimpleDTO[];
}