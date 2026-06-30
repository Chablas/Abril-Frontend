export interface DescansoMedicoListItemDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  empresaNombre?: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  estado: string;
  topicoOrigenId?: number;
  trabajadorBloqueado: boolean;
  reportadoPorTrabajador: boolean;
  createdAt: string;
}

export interface DescansoMedicoDetalleDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  proyectoId?: number;
  empresaId?: number;
  empresaNombre?: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  motivo?: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
  medicoCertifica?: string;
  establecimiento?: string;
  urlCertificado?: string;
  urlDocumento?: string;
  estado: string;
  motivoRechazo?: string;
  aprobadoPorId?: number;
  fechaAprobacion?: string;
  accidenteId?: number;
  esRecaida: boolean;
  topicoOrigenId?: number;
  prorrogaDelId?: number;
  fechaAlta?: string;
  altaPorId?: number;
  altaObservaciones?: string;
  notificadoGth: boolean;
  notificadoJefe: boolean;
  reportadoPorTrabajador: boolean;
  observaciones?: string;
  registradoPorId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DescansoMedicoCreateDto {
  workerId: number;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  motivo?: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
  medicoCertifica?: string;
  establecimiento?: string;
  accidenteId?: number;
  esRecaida?: boolean;
  topicoOrigenId?: number;
  prorrogaDelId?: number;
  proyectoId?: number;
  empresaId?: number;
  observaciones?: string;
  reportadoPorTrabajador?: boolean;
}

export interface DescansoMedicoUpdateDto {
  fechaInicio: string;
  fechaFin: string;
  motivo?: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
  medicoCertifica?: string;
  establecimiento?: string;
  observaciones?: string;
}

export interface DescansoAprobarDto {
  observaciones?: string;
}

export interface DescansoRechazarDto {
  motivoRechazo: string;
}

export interface DarAltaDto {
  observaciones?: string;
}

export interface DescansoSeguimientoDto {
  id: number;
  descansoId: number;
  fechaSeguimiento: string;
  tipo: string;
  realizadoPorRol?: string;
  realizadoPorId?: number;
  nota?: string;
  proximaCita?: string;
  urlEvidencia?: string;
  createdAt: string;
}

export interface DescansoSeguimientoCreateDto {
  tipo: string;
  nota?: string;
  proximaCita?: string;
  urlEvidencia?: string;
}

export interface DescansoFilterDto {
  workerId?: number;
  estado?: string;
  tipo?: string;
  empresaId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
}
