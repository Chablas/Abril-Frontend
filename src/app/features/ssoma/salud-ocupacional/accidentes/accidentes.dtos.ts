export interface AccidenteTrabajoListItemDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  empresaNombre?: string;
  proyectoNombre?: string;
  fechaAccidente: string;
  tipoAccidente?: string;
  lugarAccidente?: string;
  estado: string;
  notificadoSunafil: boolean;
  totalSeguimientos: number;
  createdAt: string;
}

export interface AccidenteFilterDto {
  workerId?: number;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  empresaId?: number;
  proyectoId?: number;
  page?: number;
}
