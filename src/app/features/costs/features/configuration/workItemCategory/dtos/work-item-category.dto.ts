export interface WorkItemCategoryDto {
  workItemCategoryId: number;
  workItemCategoryDescription: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
  instructivosFolderId?: string | null;
  instructivosFolderName?: string | null;
  instructivosSyncStatus?: number | null; // 1=automático, 2=manual, 3=sin instructivo
  instructivosSyncedAt?: string | null;
}

export interface WorkItemCategorySyncResultDto {
  total: number;
  matched: number;
  unmatched: number;
  created: number;
  unmatchedDescriptions: string[];
  createdDescriptions: string[];
}
