export interface WorkItemCategorySimpleDTO {
  workItemCategoryId: number;
  workItemCategoryDescription?: string;
  instructivosSyncStatus?: number | null; // 1=automático, 2=manual, 3=sin instructivo
}
