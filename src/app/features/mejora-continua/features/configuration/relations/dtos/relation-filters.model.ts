export interface RelationFiltersDTO {
  phases: { phaseId: number; phaseDescription: string }[];
  stages: { stageId: number; stageDescription: string }[];
  layers: { layerId: number; layerDescription: string }[];
  subStages: { subStageId: number; subStageDescription: string }[];
  subSpecialties: { subSpecialtyId: number; subSpecialtyDescription: string }[];
  partidas: { partidaId: number; partidaDescription: string }[];
}
