export interface DashboardEstadoDTO {
  estadoId: number;
  descripcion: string;
  count: number;
}

export interface DashboardProjectDTO {
  /** 0 cuando representa el resumen general (agregado global). */
  projectId: number;
  projectDescription: string;
  vecinosCount: number;
  solicitudes: DashboardEstadoDTO[];
  compromisos: DashboardEstadoDTO[];
}

export interface VecinosDashboardDTO {
  resumen: DashboardProjectDTO;
  proyectos: DashboardProjectDTO[];
}
