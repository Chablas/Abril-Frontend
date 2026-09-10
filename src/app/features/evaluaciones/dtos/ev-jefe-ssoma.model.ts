import type { EvPeriodoDto } from './ev-periodo.model';
export type { EvPeriodoDto } from './ev-periodo.model';
import type { EvSupervisorContratistaCriterioDto } from './ev-supervisor-contratista.model';
export type { EvSupervisorContratistaCriterioDto } from './ev-supervisor-contratista.model';

// ─── INICIO (pantalla evaluar, anónimo) ────────────────────────────────────
export interface EvJefeSsomaInicioDto {
  periodo: EvPeriodoDto | null;
  plantilla: EvSupervisorContratistaCriterioDto[];
  yaEvalue: boolean;
}

// ─── CREATE ───────────────────────────────────────────────────────────────
export interface EvJefeSsomaEvaluacionCreateDto {
  comentario: string | null;
  detalles: EvJefeSsomaDetalleCreateDto[];
}

export interface EvJefeSsomaDetalleCreateDto {
  plantillaId: number | null;
  criterio: string;
  puntaje: number;
}

// ─── PENDIENTES (solo Jefe SSOMA, sin notas) ───────────────────────────────
export interface EvJefeSsomaPendienteDto {
  userId: number;
  nombreCompleto: string;
  emailCorporativo: string;
}

export interface EvJefeSsomaCumplimientoDto {
  totalEvaluadores: number;
  totalCompletaron: number;
  pendientes: EvJefeSsomaPendienteDto[];
}

// ─── RESULTADOS (solo Jefe SSOMA) ──────────────────────────────────────────
export interface EvJefeSsomaCriterioPromedioDto {
  criterio: string;
  promedio: number;
}

export interface EvJefeSsomaTendenciaDto {
  mes: number;
  anio: number;
  nombreMes: string;
  promedio: number | null;
}

export interface EvJefeSsomaResultadosDto {
  periodo: EvPeriodoDto | null;
  totalRespuestas: number;
  promedioGeneral: number | null;
  promediosPorCriterio: EvJefeSsomaCriterioPromedioDto[];
  comentarios: string[];
  tendencia: EvJefeSsomaTendenciaDto[];
}

// ─── PLAN DE ACCIÓN (redactado por el Jefe SSOMA sobre sus propios resultados) ──
export interface EvJefeSsomaPlanAccionDto {
  id: number;
  periodoId: number;
  plantillaId: number | null;
  criterio: string;
  accion: string;
  meta: string;
  fechaLimite: string | null;
  estado: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface EvJefeSsomaPlanAccionCreateDto {
  plantillaId: number | null;
  criterio: string;
  accion: string;
  meta: string;
  fechaLimite: string | null;
}

export interface EvJefeSsomaPlanAccionUpdateDto {
  accion: string;
  meta: string;
  fechaLimite: string | null;
  estado: string;
}
