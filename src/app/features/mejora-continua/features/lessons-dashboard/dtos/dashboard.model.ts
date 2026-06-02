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

export interface DashboardSummaryDTO {
  totalLessons: number;
  totalProjects: number;
  totalAreas: number;
  totalPhases: number;
  totalUsers: number;
}

export interface LessonsDashboardDataDTO {
  summary: DashboardSummaryDTO;
  lessonsByMonth: ChartItemDTO[];
  lessonsByProject: ChartItemDTO[];
  lessonsByArea: ChartItemDTO[];
  lessonsByPhase: ChartItemDTO[];
  lessonsByPhaseAndStage: PhaseStageChartDTO[];
  lessonsBySubStage: ChartItemDTO[];
}

export interface DashboardPeriodDTO {
  periodDate: string | null;
}

export interface DashboardUserDTO {
  userId: number;
  fullName?: string;
}

export interface DashboardAreaDTO {
  lessonAreaId: number;
  areaDescription: string;
}

export interface LessonsDashboardFiltersDTO {
  periods: DashboardPeriodDTO[];
  users: DashboardUserDTO[];
  areas: DashboardAreaDTO[];
}

export interface SelectedDashboardFilters {
  periodDate: string | null;
  userId: number;
  lessonAreaId: number;
}
