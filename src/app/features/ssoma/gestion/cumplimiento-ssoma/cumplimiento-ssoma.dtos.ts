export type CumplimientoRol = 'coordinador_ssoma' | 'prevencionista' | 'ambos';
export type CumplimientoFrecuencia = 'diaria' | 'semanal' | 'mensual';
export type CumplimientoEstado = 'pendiente' | 'cumplido' | 'no_aplica';

export interface CumplimientoActividadDto {
  id: number;
  nombre: string;
  descripcion?: string;
  rolResponsable: CumplimientoRol;
  frecuencia: CumplimientoFrecuencia;
  orden: number;
  activo: boolean;
}

export interface CumplimientoActividadUpsertDto {
  nombre: string;
  descripcion?: string;
  rolResponsable: CumplimientoRol;
  frecuencia: CumplimientoFrecuencia;
  orden: number;
}

export interface CumplimientoItemDto {
  actividadId: number;
  nombre: string;
  descripcion?: string;
  rolResponsable: CumplimientoRol;
  frecuencia: CumplimientoFrecuencia;
  periodo: string;
  estado: CumplimientoEstado;
  motivoNoAplica?: string;
  fechaCumplimiento?: string;
  cumplidoPor?: string;
  observacion?: string;
}

export interface CumplimientoResumenDto {
  proyectoId: number;
  actividades: CumplimientoItemDto[];
}

export interface CumplimientoMiResumenDto {
  proyectoId: number;
  proyectoNombre: string;
  rol?: CumplimientoRol;
  actividades: CumplimientoItemDto[];
}

export interface CumplimientoMarcarDto {
  estado: CumplimientoEstado;
  motivoNoAplica?: string;
  observacion?: string;
}

export interface CumplimientoHistoricoDiaDto {
  periodo: string;
  numeroSemana?: number;
  total: number;
  cumplidas: number;
  noAplica: number;
  pendientes: number;
  porcentajeCumplimiento: number;
}

export interface CumplimientoHistoricoDto {
  proyectoId: number;
  frecuencia: CumplimientoFrecuencia;
  dias: CumplimientoHistoricoDiaDto[];
}
