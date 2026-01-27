export interface PhaseStageSubStageSubSpecialtyDTO {
  phaseId: number;
  phaseDescription: string;
  linkId?: number | undefined;
  stages?: StageFilterDTO[];
}

export interface StageFilterDTO {
  stageId: number;
  stageDescription: string;
  linkId?: number | undefined;
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