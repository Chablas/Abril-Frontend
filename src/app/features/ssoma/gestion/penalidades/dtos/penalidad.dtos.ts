export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PenalidadListQuery {
  proyectoId?: number;
  empresaId?: number;
  estado?: string;
  page?: number;
  pageSize?: number;
}

export interface PenalidadEstadoHistorialDto {
  estadoAnterior?: string;
  estadoNuevo: string;
  cambioDateTime: string;
}

export interface PenalidadListItemDto {
  id: number;
  codigo: string;
  origenTipo: string;
  origenId?: number;
  proyectoNombre?: string;
  empresaNombre?: string;
  infraccionNombre?: string;
  severidad: string;
  montoCalculado: number;
  montoFinal?: number;
  estado: string;
  createdAt: string;
  plazoDescargoVenceEn?: string;
  resueltaEn?: string;
  resolucionTipo?: string;
}

export interface PenalidadDetalleDto extends PenalidadListItemDto {
  empresaId: number;
  proyectoId: number;
  infraccionId: number;
  descripcionOcurrido?: string;
  uitReferencia: number;
  motivoAjusteMonto?: string;
  motivoRechazoResidente?: string;
  motivoRechazoGerencia?: string;
  descargoTexto?: string;
  documentoUrl?: string;
  descargoFecha?: string;
  descargoPorIncomparecencia: boolean;
  argumentoSsoma?: string;
  recomendacionSsoma?: string;
  resolucionTexto?: string;
  motivoObjecionGerencia?: string;
  pdfNotificacionUrl?: string;
  pdfResolucionUrl?: string;
  apelacionUsada: boolean;
  plazoApelacionVenceEn?: string;
  apelacionTexto?: string;
  apelacionDocumentoUrl?: string;
  apelacionFecha?: string;
  historial: PenalidadEstadoHistorialDto[];
}

export interface PenalidadRegistrarRequest {
  origenTipo: 'RAC' | 'AMONESTACION' | 'DIRECTO';
  origenId?: number;
  empresaId: number;
  proyectoId: number;
  infraccionId: number;
  severidad: string;
  descripcionOcurrido?: string;
}

export interface PenalidadRechazarRequest {
  motivo: string;
}

export interface PenalidadDescargaRequest {
  descargoTexto: string;
  documentoUrl: string;
}

export interface PenalidadEvaluarDescargoRequest {
  recomendacion: 'Aprobar' | 'Rechazar';
  argumento: string;
}

export interface PenalidadDecidirGerenciaRequest {
  resolucionTipo: 'Aplicada' | 'Anulada';
  resolucionTexto?: string;
  montoFinal?: number;
  motivoAjusteMonto?: string;
  motivoObjecionGerencia?: string;
}

export interface PenalidadApelarRequest {
  texto: string;
  documentoUrl: string;
}

export interface PenalidadDecidirApelacionRequest {
  resolucionTipo: 'Aplicada' | 'Anulada';
  resolucionTexto?: string;
  motivoObjecionGerencia?: string;
}

export interface PenalidadCreadaDto {
  id: number;
  codigo: string;
}

export interface GestionPreviaDto {
  id: number;
  empresaId: number;
  proyectoId?: number;
  tipo: string;
  fecha: string;
  descripcion: string;
  adjuntoUrl?: string;
  registradoPorNombre?: string;
  createdAt: string;
}

export interface GestionPreviaRegistrarRequest {
  empresaId: number;
  proyectoId?: number;
  tipo: 'Correo' | 'CartaPreocupacion' | 'Reunion' | 'Llamada' | 'Otro';
  fecha: string;
  descripcion: string;
  adjuntoUrl?: string;
}

export interface ContextoEmpresaDto {
  penalidadesAplicadasUltimos12Meses: number;
  penalidadesTotalHistorico: number;
  gestionPrevia: GestionPreviaDto[];
}

export interface InfraccionAdminDto {
  id: number;
  nombre: string;
  factorUit?: number;
  montoFijo?: number;
  descripcion?: string;
  activo: boolean;
}

export interface InfraccionUpsertRequest {
  nombre: string;
  factorUit?: number;
  montoFijo?: number;
  descripcion?: string;
  activo: boolean;
}

export interface UitAnioAdminDto {
  id: number;
  anio: number;
  valor: number;
  activo: boolean;
}

export interface UitAnioUpsertRequest {
  anio: number;
  valor: number;
  activo: boolean;
}
