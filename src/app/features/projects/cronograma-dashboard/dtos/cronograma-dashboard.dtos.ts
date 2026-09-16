export interface CronogramaDashboardKpisDto {
  totalProyectos: number;
  porcentajeAvancePromedio: number;
  proyectosAlDia: number;
  proyectosConRetraso: number;
  proyectosSinActividades: number;
  actividadesVencidas: number;
  actividadesCulminadasEstaSemana: number;
  actividadesCulminadasEsteMes: number;
}

export interface CronogramaDashboardProyectoDto {
  projectId: number;
  projectDescription: string;
  responsableUdp: string;
  totalActividades: number;
  culminadas: number;
  enProceso: number;
  vencidas: number;
  pendientes: number;
  porcentajeAvance: number;
  diasRetraso: number;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  estado: 'AL_DIA' | 'CON_RETRASO' | 'SIN_ACTIVIDADES';
  spi: number;
}

export interface CronogramaDashboardResponsableDto {
  userId: number;
  nombreCompleto: string;
}

export interface CronogramaDashboardResponseDto {
  kpis: CronogramaDashboardKpisDto;
  proyectos: CronogramaDashboardProyectoDto[];
  responsables: CronogramaDashboardResponsableDto[];
}

// ── Ranking + Heatmap (migrados de projects-dashboard, ver Fase 1 de la
//    consolidación de dashboards de Unidad de Proyectos) ────────────────────

export interface RankingResponsableDto {
  posicion: number;
  nombre: string;
  proyectos: number;
  completadas: number;
  vencidas: number;
  score: number;
}

export interface HeatmapSemanaDto {
  semana: string;
  cantidad: number;
}

export interface HeatmapResponsableDto {
  responsable: string;
  semanas: HeatmapSemanaDto[];
}

/**
 * Subconjunto de la respuesta de GET api/v1/projects-dashboard: ese endpoint devuelve más campos
 * (proyectos, filtros, distribucionPorEstado, etc.) que no se migran a Dashboard UDP porque ya
 * están cubiertos por los KPI cards existentes — solo se tipan los dos campos que sí se consumen.
 */
export interface ProjectsDashboardOverviewDto {
  rankingResponsables: RankingResponsableDto[];
  heatmapCarga: HeatmapResponsableDto[];
}

// ── Detalle de proyecto para el panel lateral de Gantt ──────────────────────

export interface ActividadCriticaDto {
  nombre: string;
  responsable: string | null;
  fechaFin: string;
  diasRetraso: number;
}

export interface GanttTareaDto {
  id: number | string;
  text: string;
  start_date: string;
  duration: number;
  parent?: number | string;
  progress?: number;
  open?: boolean;
}

export interface ProyectoDetalleDto {
  proyectoId: number;
  proyectoNombre: string;
  estado: string;
  avanceProgramado: number;
  avanceReal: number;
  diasRetraso: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  actividadesVencidas: ActividadCriticaDto[];
  actividadesCriticas: ActividadCriticaDto[];
  gantt: {
    tasks: GanttTareaDto[];
    links: { id: number; source: number; target: number; type: string }[];
  };
}
