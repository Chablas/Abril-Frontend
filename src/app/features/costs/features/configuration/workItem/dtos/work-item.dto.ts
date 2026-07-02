export interface WorkItemDto {
  workItemId: number;
  workItemDescription: string;
  workItemCategoryId?: number | null;
  workItemCategoryDescription?: string | null;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
  valorizationForms: WorkItemValorizationFormDto[];
}

/** Una línea de la forma de valorización (cláusula 5.1): porcentaje + concepto. */
export interface WorkItemValorizationFormDto {
  workItemValorizationFormId: number;
  concept: string;
  percentage: number;
  sortOrder: number;
}

/** Opción para el desplegable de partidas de control. */
export interface WorkItemCategoryOptionDto {
  workItemCategoryId: number;
  workItemCategoryDescription: string;
}

export interface WorkItemSyncResultDto {
  projectsScanned: number;
  created: number;
  existing: number;
  createdDescriptions: string[];
  projectsWithoutContratosFolder: string[];
}
