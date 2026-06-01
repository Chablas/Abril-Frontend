export interface LessonDetailDTO {
  lessonId: number;
  lessonCode?: string;
  period: string;
  problemDescription?: string;
  reasonDescription?: string;
  lessonDescription?: string;
  impactDescription?: string;

  projectId?: number;
  projectDescription?: string;

  areaId: number;
  /** Path completo (incluye Gerencia). Mostrado en el modal de detalle. */
  areaDescription: string;
  /** Path "corto" sin Gerencia, en MAYÚSCULAS. Espejo del campo de la lista. */
  areaListDescription?: string;
  subAreaId?: number;
  subAreaDescription?: string;

  phaseStageSubStageSubSpecialtyId?: number;
  phaseId?: number;
  phaseDescription?: string;
  stageId?: number;
  stageDescription?: string;
  layerId?: number;
  layerDescription?: string;
  subStageId?: number;
  subStageDescription?: string;
  subSpecialtyId?: number;
  subSpecialtyDescription?: string;
  partidaId?: number;
  partidaDescription?: string;

  stateId: number;
  stateDescription: string;
  images?: LessonImageDTO[];

  createdDateTime: string;
  createdUserId: number;
  createdUserFullName: string;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}

export interface LessonImageDTO {
  lessonImageId: number;
  imageUrl: string;
  lessonId: number;
  imageTypeId: number;
  imageTypeDescription: string;
}
