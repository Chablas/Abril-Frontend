export interface TopicoAtencionDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  fecha: string;           // ISO date 'YYYY-MM-DD'
  hora?: string;           // 'HH:mm:ss'
  tipoAtencionId: number;
  tipoAtencionNombre?: string;
  motivo?: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
  tratamiento?: string;
  medicamentos?: string;
  presionArterial?: string;
  temperatura?: number;
  frecuenciaCardiaca?: number;
  saturacionOxigeno?: number;
  peso?: number;
  derivadoClinica: boolean;
  clinicaDerivacion?: string;
  generaDescanso: boolean;
  descansoDias?: number;
  generaAccidente: boolean;
  accidenteId?: number;
  proyectoId?: number;
  proyectoNombre?: string;
  empresaId?: number;
  empresaNombre?: string;
  observaciones?: string;
  registradoPorId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicoFiltrosDto {
  fechaDesde?: string;
  fechaHasta?: string;
  workerId?: number;
  tipoAtencionId?: number;
  proyectoId?: number;
  page?: number;
  pageSize?: number;
}

export interface CrearTopicoAtencionDto {
  workerId: number;
  fecha: string;
  hora?: string;
  tipoAtencionId: number;
  motivo?: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
  tratamiento?: string;
  medicamentos?: string;
  presionArterial?: string;
  temperatura?: number;
  frecuenciaCardiaca?: number;
  saturacionOxigeno?: number;
  peso?: number;
  derivadoClinica: boolean;
  clinicaDerivacion?: string;
  generaDescanso: boolean;
  descansoDias?: number;
  generaAccidente: boolean;
  proyectoId?: number;
  empresaId?: number;
  observaciones?: string;
}

export interface ActualizarTopicoAtencionDto extends Partial<CrearTopicoAtencionDto> {}

export interface TopicoTipoAtencionDto {
  id: number;
  nombre: string;
  descripcion?: string;
}
