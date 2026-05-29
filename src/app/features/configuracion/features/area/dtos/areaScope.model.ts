export interface AreaScopeTreeDto {
  areaScopeId: number;
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaScopeParentId: number | null;
  displayOrder: number;
  active: boolean;
  children: AreaScopeTreeDto[];
}

export interface AreaScopeBranchNodeDto {
  tempId: number;
  areaItemId: number;
  parentTempId: number | null;
  displayOrder: number;
}

export interface AreaScopeBranchDto {
  nodes: AreaScopeBranchNodeDto[];
}
