export interface RelationFlatDTO {
  linkId: number;

  phaseId: number;
  phaseDescription: string;

  stageId?: number | null;
  stageDescription?: string | null;

  layerId?: number | null;
  layerDescription?: string | null;

  subStageId?: number | null;
  subStageDescription?: string | null;

  subSpecialtyId?: number | null;
  subSpecialtyDescription?: string | null;

  partidaId?: number | null;
  partidaDescription?: string | null;
}

export interface RelationFlatPagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: RelationFlatDTO[];
}
