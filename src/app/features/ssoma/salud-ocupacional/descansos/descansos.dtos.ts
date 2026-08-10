import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';

/**
 * Tipo de descanso (ss_descanso_tipo) — único clasificador. En Descansos se muestran los 4
 * (`nombre`); en Mi Salud solo los "común" y con `nombreCorto`.
 */
export interface DescansoTipoDto {
  id: number;
  nombre: string;
  nombreCorto: string;
}

export interface DescansoAdjuntoDto {
  url: string;
  nombre?: string;
}

export interface DescansoMedicoListItemDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  empresaNombre?: string;
  tipoId: number;
  /** Nombre del tipo resuelto en el backend desde el catálogo. */
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
  tipoId: number;
  /** Nombre del tipo resuelto en el backend desde el catálogo. */
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  diagnostico?: string;
  diagnosticoCie10?: string;
  urlCertificado?: string;
  urlDocumento?: string;
  adjuntos: DescansoAdjuntoDto[];
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
  tipoId: number;
  fechaInicio: string;
  fechaFin: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
  accidenteId?: number;
  esRecaida?: boolean;
  topicoOrigenId?: number;
  prorrogaDelId?: number;
  proyectoId?: number;
  empresaId?: number;
}

export interface DescansoMedicoUpdateDto {
  tipoId: number;
  fechaInicio: string;
  fechaFin: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
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
  /** null = "Todos" (lo que emite el combobox al limpiar); toParams lo omite de la query. */
  tipoId?: number | null;
  empresaId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
}

/** Respuesta de la carga inicial: catálogo de tipos + primera página, en una sola petición. */
export interface DescansosInicioDto {
  tipos: DescansoTipoDto[];
  descansos: PagedResponseDTO<DescansoMedicoListItemDto>;
}
