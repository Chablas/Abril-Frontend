export type EstadoInterconsulta = 'Pendiente' | 'Atendida' | 'Cancelada' | string;

export interface InterconsultaListDto {
  id: number;
  emoId: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  proyectoNombre?: string;
  razonSocial?: string;
  especialidad: string;
  diagnostico?: string;
  fechaDerivacion: string;
  fechaAtencion?: string;
  estado: EstadoInterconsulta;
  diasPendiente: number;
}

export interface InterconsultaDetalleDto extends InterconsultaListDto {
  motivo?: string;
  diagnostico?: string;
  cie10?: string;
  resultado?: string;
  urlInforme?: string;
  medico?: string;
  notas?: string;
}

export interface InterconsultaUpdateDto {
  fechaAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  resultado?: string;
  urlInforme?: string;
  estado?: EstadoInterconsulta;
  notas?: string;
}

export interface InterconsultaResultadoPatchDto {
  estado: EstadoInterconsulta;
  fechaAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  resultado?: string;
  urlInforme?: string;
  requiereSeguimiento?: boolean;
}

export interface InterconsultaDerivacionPatchDto {
  especialidad: string;
  diagnostico?: string;
}

export interface InterconsultaQueryParams {
  estado?: string;
  search?: string;
  workerId?: number;
  page?: number;
  pageSize?: number;
}
