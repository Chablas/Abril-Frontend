export interface LessonListDTO {
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
  areaDescription: string;

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

  stateId: number;
  stateDescription: string;
  images: LessonImage[];

  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}

export interface LessonListPagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: LessonListDTO[];
}

interface LessonImage {
  lessonImageId: number;
  imageUrl: string;
  lessonId: number;
  imageTypeId: number;
  imageTypeDescription: string;
}