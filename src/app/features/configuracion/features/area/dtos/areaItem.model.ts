export interface AreaItemDto {
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaItemParentId?: number | null;
  areaItemParentName?: string | null;
  active: boolean;
}

export interface AreaItemCreateDto {
  areaItemName: string;
  areaTypeId: number;
  areaItemParentId?: number | null;
  active: boolean;
}

export interface AreaItemEditDto {
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaItemParentId?: number | null;
  active: boolean;
}

export interface AreaItemSimpleDto {
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaItemParentId?: number | null;
}

export interface AreaItemFilterDto {
  page: number;
  pageSize?: number;
  areaTypeId?: number | null;
  areaItemParentId?: number | null;
  active?: boolean | null;
  search?: string | null;
}

export interface AreaItemTreeDto {
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaItemParentId?: number | null;
  active: boolean;
  children: AreaItemTreeDto[];
}
