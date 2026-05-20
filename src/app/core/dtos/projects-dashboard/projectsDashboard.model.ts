export interface ProjectsDashboardFilterItemDTO {
  id: number;
  nombre: string;
}

export interface ProjectsDashboardFiltersDTO {
  proyectos: ProjectsDashboardFilterItemDTO[];
  estados: string[];
  responsablesArqCom: ProjectsDashboardFilterItemDTO[];
}

export interface ProjectsDashboardItemDTO {
  proyectoId: number;
  proyectoNombre: string;
  estado: string;
  responsableArqCom: string | null;
  avanceProgramado: number;
  avanceReal: number;
  tieneRetraso: boolean;
}

export interface ProjectsDashboardDTO {
  totalProyectos: number;
  alDia: number;
  conRetraso: number;
  avancePromedio: number;
  proyectos: ProjectsDashboardItemDTO[];
}
