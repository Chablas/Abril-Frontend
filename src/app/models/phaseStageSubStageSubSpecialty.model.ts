export interface PhaseStageSubStageSubSpecialtyDTO {
  phaseId: number;
  phaseDescription: string;
  stages?: StageFilterDTO[];
}

export interface StageFilterDTO {
  stageId: number;
  stageDescription: string;
  subStages?: SubStageFilterDTO[];
}

export interface SubStageFilterDTO {
  subStageId: number;
  subStageDescription: string;
  subSpecialties?: SubSpecialtyFilterDTO[];
}

export interface SubSpecialtyFilterDTO {
  subSpecialtyId: number;
  subSpecialtyDescription: string;
}