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

  /** ID del nodo hoja en el árbol de scope (catalog_item). */
  catalogItemId?: number;
  /** Segmentos de clasificación caminando scope_item (raíz → hoja). */
  classificationSegments?: LessonClassificationSegment[];

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

/** Un nivel de la clasificación (Fase / Etapa / Nivel / …) con su descripción. */
export interface LessonClassificationSegment {
  catalogTypeName: string;
  catalogItemDescription: string;
}
