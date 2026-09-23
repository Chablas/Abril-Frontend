import type { EvPeriodoDto } from './ev-periodo.model';
export type { EvPeriodoDto } from './ev-periodo.model';

// ─── PENDIENTES (staff del proyecto del residente, sin evaluar en el período) ──
export interface EvEvaluacionStaffPendienteDto {
  workerId: number;
  nombreCompleto: string;
  puesto: string;
  puestoId: number;
}

// ─── PLANTILLA (criterios a evaluar según el puesto del trabajador) ────────────
export interface EvEvaluacionStaffCriterioDto {
  id: number;
  criterio: string;
  tipo: 'FUNCIONAL' | 'TRANSVERSAL';
  orden: number;
}

// ─── CREATE ─────────────────────────────────────────────────────────────────
export interface EvEvaluacionStaffDetalleCreateDto {
  plantillaId: number;
  puntaje: number;
}

export interface EvEvaluacionStaffCreateDto {
  evaluadoWorkerId: number;
  comentario?: string | null;
  detalles: EvEvaluacionStaffDetalleCreateDto[];
}

// ─── RESULTADOS ─────────────────────────────────────────────────────────────
export interface EvEvaluacionStaffResultadoDto {
  workerId: number;
  nombreCompleto: string;
  puesto: string;
  promedioFuncional: number | null;
  promedioTransversal: number | null;
  promedioGeneral: number | null;
}
