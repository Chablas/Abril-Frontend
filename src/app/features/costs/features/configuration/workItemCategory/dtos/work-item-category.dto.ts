export interface WorkItemCategoryClauseDto {
  workItemCategoryClauseId: number;
  clauseText: string;
  sortOrder: number;
  appliesSuministro: boolean;
  appliesInstalacion: boolean;
  appliesSuministroInstalacion: boolean;
}

export interface WorkItemCategoryAnexo3ClauseDto {
  workItemCategoryAnexo3ClauseId: number;
  clauseText: string;
  sortOrder: number;
}

export interface WorkItemCategoryAnexo4ClauseDto {
  workItemCategoryAnexo4ClauseId: number;
  clauseText: string;
  sortOrder: number;
}

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
  clauses: WorkItemCategoryClauseDto[];
  anexo3Clauses: WorkItemCategoryAnexo3ClauseDto[];
  anexo4Clauses: WorkItemCategoryAnexo4ClauseDto[];
}

export interface WorkItemCategorySyncResultDto {
  total: number;
  matched: number;
  unmatched: number;
  created: number;
  unmatchedDescriptions: string[];
  createdDescriptions: string[];
}
