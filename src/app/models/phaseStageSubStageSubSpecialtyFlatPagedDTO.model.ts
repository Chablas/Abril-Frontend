export interface PhaseStageSubStageSubSpecialtyFlatDTO {
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
}

export interface PhaseStageSubStageSubSpecialtyFlatPagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: PhaseStageSubStageSubSpecialtyFlatDTO[];
}