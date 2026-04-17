export interface WorkItemCategoryDto {
  workItemCategoryId: number;
  workItemCategoryDescription: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}
