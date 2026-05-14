import { AreaSimpleDTO } from '../../../../../core/dtos/area/areaSimple.model';
import { ProjectSimpleDTO } from '../../../../../core/dtos/project/projectSimple.model';
import { LessonPeriodDTO } from './lessonPeriod.model';
import { PhaseSimpleDTO } from '../../../../../core/dtos/phase/phaseSimple.model';
import { StageSimpleDTO } from '../../../../../core/dtos/stage/stageSimple.model';
import { LayerSimpleDTO } from '../../../../../core/dtos/layer/layerSimple.model';
import { SubStageSimpleDTO } from '../../../../../core/dtos/subStage/subStageSimple.model';
import { UserSimpleDTO } from '../../../../../core/dtos/user/userSimple.model';
import { SubSpecialtySimpleDTO } from '../../../../../core/dtos/subSpecialty/subSpecialtySimple.model';

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
