export type EstadoDeclaracion = 'BORRADOR' | 'PRESENTADA';

export type EtapaEoRsDeclaracion = 'RECOLECCION_TRANSPORTE' | 'TRATAMIENTO' | 'VALORIZACION';

export interface DeclaracionResiduoDetalleDto {
  id: number;
  residuoTipoId: number;
  nombreResiduoTipo?: string | null;
  cantidadAcumuladaAnterior: number;
  ene: number;
  feb: number;
  mar: number;
  abr: number;
  may: number;
  jun: number;
  jul: number;
  ago: number;
  sep: number;
  oct: number;
  nov: number;
  dic: number;
  almacenado: number;
  tratado: number;
  acondicionado: number;
  valorizado: number;
  comercializado: number;
  disposicionFinal: number;
}

export interface DeclaracionResiduoDetalleUpsertRequest {
  residuoTipoId: number;
  cantidadAcumuladaAnterior: number;
  ene: number;
  feb: number;
  mar: number;
  abr: number;
  may: number;
  jun: number;
  jul: number;
  ago: number;
  sep: number;
  oct: number;
  nov: number;
  dic: number;
  almacenado: number;
  tratado: number;
  acondicionado: number;
  valorizado: number;
  comercializado: number;
  disposicionFinal: number;
}

export interface DeclaracionResiduoEoRsDto {
  id: number;
  eoRsId: number;
  nombreEoRs?: string | null;
  etapa: EtapaEoRsDeclaracion;
  numeroServiciosAnio: number;
  totalResiduoTon: number;
}

export interface DeclaracionResiduoEoRsUpsertRequest {
  eoRsId: number;
  etapa: EtapaEoRsDeclaracion;
  numeroServiciosAnio: number;
  totalResiduoTon: number;
}

export interface DeclaracionResiduoDto {
  id: number;
  contributorId: number;
  nombreContributor?: string | null;
  periodoAnio: number;
  estado: EstadoDeclaracion;
  fechaPresentacion?: string | null;
  archivoConstanciaUrl?: string | null;
  detalles: DeclaracionResiduoDetalleDto[];
  eoRsIntervinientes: DeclaracionResiduoEoRsDto[];
}

export interface DeclaracionResiduoUpsertRequest {
  contributorId: number;
  periodoAnio: number;
}

export interface DeclaracionResiduoMarcarPresentadaRequest {
  fechaPresentacion: string;
  archivoConstanciaUrl?: string | null;
}

export interface DeclaracionResiduoRecalcularRequest {
  contributorId: number;
  periodoAnio: number;
  forzar: boolean;
}

export const MESES_DECLARACION: { key: keyof DeclaracionResiduoDetalleUpsertRequest; label: string }[] = [
  { key: 'ene', label: 'Ene' },
  { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' },
  { key: 'abr', label: 'Abr' },
  { key: 'may', label: 'May' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'ago', label: 'Ago' },
  { key: 'sep', label: 'Sep' },
  { key: 'oct', label: 'Oct' },
  { key: 'nov', label: 'Nov' },
  { key: 'dic', label: 'Dic' },
];

export const MANEJO_DECLARACION: { key: keyof DeclaracionResiduoDetalleUpsertRequest; label: string }[] = [
  { key: 'almacenado', label: 'Almacenado' },
  { key: 'tratado', label: 'Tratado' },
  { key: 'acondicionado', label: 'Acondicionado' },
  { key: 'valorizado', label: 'Valorizado' },
  { key: 'comercializado', label: 'Comercializado' },
  { key: 'disposicionFinal', label: 'Disposición Final' },
];
