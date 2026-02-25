import { PhaseSimpleDTO } from "../phase/phaseSimple.model";
import { StageSimpleDTO } from "../stage/stageSimple.model";
import { LayerSimpleDTO } from "../layer/layerSimple.model";
import { SubStageSimpleDTO } from "../subStage/subStageSimple.model";
import { SubSpecialtySimpleDTO } from "../subSpecialty/subSpecialtySimple.model";

export interface PhaseStageSubStageSubSpecialtyFiltersCreateDTO {
    phases: PhaseSimpleDTO[];
    stages: StageSimpleDTO[];
    layers: LayerSimpleDTO[];
    subStages: SubStageSimpleDTO[];
    subSpecialties: SubSpecialtySimpleDTO[];
}