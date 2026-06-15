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
