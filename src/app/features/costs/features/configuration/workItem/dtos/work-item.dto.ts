export interface WorkItemDto {
  workItemId: number;
  workItemDescription: string;
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

export interface WorkItemSyncResultDto {
  projectsScanned: number;
  created: number;
  existing: number;
  createdDescriptions: string[];
  projectsWithoutContratosFolder: string[];
}
