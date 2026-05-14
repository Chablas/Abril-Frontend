export interface CreateRelationDTO {
  phaseId: number;
  stageId: number | null;
  layerId: number | null;
  subStageId: number | null;
  subSpecialtyId: number | null;
  partidaId: number | null;
  active: boolean;
}
