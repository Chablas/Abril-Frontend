export interface ScopeItemDTO {
  scopeItemId: number;
  areaSubareaId: number;
  catalogItemId: number;
  catalogItemDescription: string;
  catalogTypeName: string;
  scopeItemParentId: number | null;
  displayOrder: number;
  active: boolean;
  children: ScopeItemDTO[];
}
