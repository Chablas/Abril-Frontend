export interface WorkItemCategoryClauseUpsertDto {
  workItemCategoryClauseId?: number;
  clauseText: string;
  sortOrder: number;
}

export interface WorkItemCategoryAnexo3ClauseUpsertDto {
  workItemCategoryAnexo3ClauseId?: number;
  clauseText: string;
  sortOrder: number;
}

export interface WorkItemCategoryAnexo4ClauseUpsertDto {
  workItemCategoryAnexo4ClauseId?: number;
  clauseText: string;
  sortOrder: number;
}

export interface WorkItemCategoryEditDto {
  workItemCategoryId: number;
  workItemCategoryDescription: string;
  active: boolean;
  clauses: WorkItemCategoryClauseUpsertDto[];
  anexo3Clauses: WorkItemCategoryAnexo3ClauseUpsertDto[];
  anexo4Clauses: WorkItemCategoryAnexo4ClauseUpsertDto[];
}
