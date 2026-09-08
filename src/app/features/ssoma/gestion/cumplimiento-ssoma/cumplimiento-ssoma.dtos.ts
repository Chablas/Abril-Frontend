export type CumplimientoRol = 'coordinador_ssoma' | 'prevencionista' | 'ambos';
export type CumplimientoFrecuencia = 'diaria' | 'semanal' | 'mensual';

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
  cumplido: boolean;
  fechaCumplimiento?: string;
  cumplidoPor?: string;
  observacion?: string;
}

export interface CumplimientoResumenDto {
  proyectoId: number;
  actividades: CumplimientoItemDto[];
}

export interface CumplimientoMarcarDto {
  cumplido: boolean;
  observacion?: string;
}
