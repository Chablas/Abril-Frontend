export interface PhaseStageSubStageSubSpecialtyDTO {
  phaseId: number;
  phaseDescription: string;
  linkId?: number;
  stages?: StageFilterDTO[];
}

export interface StageFilterDTO {
  stageId: number;
  stageDescription: string;
  linkId?: number;
  subStages?: SubStageFilterDTO[];
  layers?: LayerFilterDTO[];
}

export interface LayerFilterDTO {
  layerId: number;
  layerDescription: string;
  linkId?: number;
  subStages?: SubStageFilterDTO[];
}

export interface SubStageFilterDTO {
  subStageId: number;
  subStageDescription: string;
  linkId?: number | undefined;
  subSpecialties?: SubSpecialtyFilterDTO[];
}

export interface SubSpecialtyFilterDTO {
  subSpecialtyId: number;
  subSpecialtyDescription: string;
  linkId: number | undefined;
}