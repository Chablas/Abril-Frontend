export type EstadoProgramacion =
  | 'Programada'
  | 'Confirmada'
  | 'Completada'
  | 'No se presentó'
  | 'Cancelada'
  | string;

export interface ProgramacionListDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  tipoEmo: string;
  empresa: string;
  fecha: string;
  hora?: string;
  clinica?: string;
  medico?: string;
  estado: EstadoProgramacion;
  motivo?: string;
  notas?: string;
}

export interface ProgramacionCreateDto {
  workerId: number;
  tipoEmoId: number;
  empresaId: number;
  fecha: string;
  hora?: string;
  clinicaId?: number;
  medicoId?: number;
  motivo?: string;
  notas?: string;
}

export interface ProgramacionUpdateDto extends Partial<ProgramacionCreateDto> {}

export interface ProgramacionEstadoPatchDto {
  estado: EstadoProgramacion;
  motivo?: string;
}

export interface ProgramacionQueryParams {
  desde?: string;
  hasta?: string;
  estado?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}
