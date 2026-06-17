export interface WorkItemDto {
  workItemId: number;
  workItemDescription: string;
  workSpecialtyId?: number | null;
  workSpecialtyDescription?: string | null;
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

export interface WorkSpecialtyOptionDto {
  workSpecialtyId: number;
  workSpecialtyDescription: string;
}

export interface WorkItemFormDataDto {
  specialties: WorkSpecialtyOptionDto[];
}

export interface WorkItemSyncResultDto {
  projectsScanned: number;
  created: number;
  existing: number;
  specialtyFilled: number;
  createdDescriptions: string[];
  projectsWithoutContratosFolder: string[];
}
