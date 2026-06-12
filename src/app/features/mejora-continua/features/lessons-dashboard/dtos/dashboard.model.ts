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

export interface PendingUserDTO {
  userId: number;
  fullName?: string;
  email?: string;
  projects: string[];
}

export interface LessonsDashboardDataDTO {
  summary: DashboardSummaryDTO;
  lessonsByMonth: ChartItemDTO[];
  lessonsByProject: ChartItemDTO[];
  lessonsByArea: ChartItemDTO[];
  lessonsByUser: ChartItemDTO[];
  lessonsByPhase: ChartItemDTO[];
  lessonsByPhaseAndStage: PhaseStageChartDTO[];
  lessonsBySubStage: ChartItemDTO[];
  pendingPeriodLabel: string;
  pendingUsers: PendingUserDTO[];
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

export interface DashboardProjectDTO {
  projectId: number;
  projectDescription: string;
}

export interface LessonsDashboardFiltersDTO {
  periods: DashboardPeriodDTO[];
  users: DashboardUserDTO[];
  areas: DashboardAreaDTO[];
  projects: DashboardProjectDTO[];
}

export interface SelectedDashboardFilters {
  periodDate: string | null;
  userId: number;
  /** lesson_area_ids efectivos (subárbol del nodo de área donde se detuvo el usuario). */
  lessonAreaIds: number[];
  projectIds: number[];
}
