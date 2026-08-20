import type { EvPeriodoDto } from './ev-periodo.model';
export type { EvPeriodoDto } from './ev-periodo.model';

// ─── INICIO (pantalla evaluar) ─────────────────────────────────────────────
export interface EvSupervisorContratistaInicioDto {
  periodo: EvPeriodoDto | null;
  plantilla: EvSupervisorContratistaCriterioDto[];
  supervisoresAEvaluar: EvSupervisorContratistaAEvaluarDto[];
  yaMarcoNoAplica: boolean;
}

export interface EvSupervisorContratistaCriterioDto {
  id: number;
  criterio: string;
  orden: number;
}

export interface EvSupervisorContratistaAEvaluarDto {
  supervisorSsContratistaUsuarioId: number;
  supervisorNombre: string;
  contributorId: number;
  contributorNombre: string;
  proyectoId: number;
  proyectoNombre: string;
  yaEvalue: boolean;
  notaPrevia: number | null;
}

// ─── CREATE ───────────────────────────────────────────────────────────────
export interface EvSupervisorContratistaEvaluacionCreateDto {
  supervisorSsContratistaUsuarioId: number;
  proyectoId: number;
  comentario: string | null;
  detalles: EvSupervisorContratistaDetalleCreateDto[];
}

export interface EvSupervisorContratistaDetalleCreateDto {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
  esNa: boolean;
}

// ─── VER EVALUACIONES / DASHBOARD (solo Jefe SSOMA) ────────────────────────
export interface EvSupervisorContratistaVerInicioDto {
  periodos: EvPeriodoDto[];
  proyectos: EvSupervisorContratistaProyectoFiltroDto[];
  evaluaciones: EvSupervisorContratistaResumenDto[];
}

export interface EvSupervisorContratistaProyectoFiltroDto {
  proyectoId: number;
  proyectoNombre: string;
}

export interface EvSupervisorContratistaResumenDto {
  evaluacionId: number;
  supervisorSsContratistaUsuarioId: number;
  supervisorNombre: string;
  contributorId: number;
  contributorNombre: string;
  proyectoId: number;
  proyectoNombre: string;
  evaluadorNombre: string;
  nota: number | null;
  comentario: string | null;
  createdAt: string;
}

export interface EvSupervisorContratistaDashboardDto {
  totalEvaluaciones: number;
  promedioGeneral: number | null;
  evaluaciones: EvSupervisorContratistaResumenDto[];
}
