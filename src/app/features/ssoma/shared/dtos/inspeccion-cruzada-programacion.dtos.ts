export interface ProyectoSimpleInspeccionCruzadaDTO {
  proyectoId: number;
  nombre: string;
}

export interface MiembroAnilloDTO {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  orden: number;
  activo: boolean;
}

export interface AnilloDTO {
  id: number;
  nombre: string;
  miembros: MiembroAnilloDTO[];
}

export interface ReordenarItemDTO {
  id: number;
  orden: number;
}

export interface ProgramacionInspeccionCruzadaDTO {
  id: number;
  anio: number;
  mes: number;
  anilloId: number;
  anilloNombre: string;
  proyectoInspectorId: number;
  proyectoInspectorNombre: string;
  proyectoInspeccionadoId: number;
  proyectoInspeccionadoNombre: string;
  esManual: boolean;
  motivoCambio: string | null;
}
