export interface ChartItemDTO {
  id: number;
  label: string;
  value: number;
}

export interface PhaseStageChartDTO {
  phaseId: number;
  phaseLabel: string;
  stages: ChartItemDTO[];
}

export interface DashboardDTO {
  lessonsByPhase: ChartItemDTO[];
  lessonsByProject: ChartItemDTO[];
  lessonsByPhaseAndStage: PhaseStageChartDTO[];
  lessonsBySubStage: ChartItemDTO[];
}