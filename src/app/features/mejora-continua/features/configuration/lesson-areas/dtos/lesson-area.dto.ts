export interface LessonAreaConfigItemDto {
  lessonAreaId: number | null;
  areaItemId: number;
  areaItemName: string;
  areaTypeName: string;
  parentName: string | null;
  active: boolean;
}

export interface ToggleLessonAreaResultDto {
  lessonAreaId: number;
  active: boolean;
}
