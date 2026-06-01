export interface LessonAreaSegmentDto {
  areaItemName: string;
  areaTypeName: string;
}

export interface LessonAreaConfigItemDto {
  lessonAreaId: number | null;
  areaScopeId: number;
  path: LessonAreaSegmentDto[];
  active: boolean;
}

export interface ToggleLessonAreaResultDto {
  lessonAreaId: number;
  active: boolean;
}
