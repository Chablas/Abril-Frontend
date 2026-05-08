export interface WorkItemCategoryClauseUpsertDto {
  workItemCategoryClauseId?: number;
  clauseText: string;
  sortOrder: number;
}

export interface WorkItemCategoryEditDto {
  workItemCategoryId: number;
  workItemCategoryDescription: string;
  active: boolean;
  clauses: WorkItemCategoryClauseUpsertDto[];
}
