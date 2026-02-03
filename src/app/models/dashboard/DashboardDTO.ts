export interface ChartItemDTO {
  id: number;
  label: string;
  value: number;
}

export interface DashboardDTO {
  lessonsByPhase: ChartItemDTO[];
  lessonsByProject: ChartItemDTO[];
}