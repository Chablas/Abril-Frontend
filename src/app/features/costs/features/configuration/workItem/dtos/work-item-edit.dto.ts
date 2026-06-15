export interface WorkItemEditDto {
  workItemId: number;
  workItemDescription: string;
  workSpecialtyId?: number | null;
  active: boolean;
}
