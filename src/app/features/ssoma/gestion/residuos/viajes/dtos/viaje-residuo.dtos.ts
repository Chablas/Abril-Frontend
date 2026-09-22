export type ResiduoViajeOrigen = 'DEMOLICION' | 'EXCAVACION' | 'CONSTRUCCION' | 'OTRO';
export type ResiduoViajeTipoManejo =
  | 'ALMACENADO'
  | 'TRATADO'
  | 'ACONDICIONADO'
  | 'VALORIZADO'
  | 'COMERCIALIZADO'
  | 'DISPOSICION_FINAL';

export interface ResiduoViajeDto {
  id: number;
  projectId: number;
  autorizacionDmeId?: number | null;
  residuoTipoId: number;
  nombreResiduoTipo?: string | null;
  eoRsId: number;
  nombreEoRs?: string | null;
  contratista?: string | null;
  origen?: ResiduoViajeOrigen | string | null;
  fecha: string;
  cantidadM3: number;
  cantidadTon?: number | null;
  tipoManejo: ResiduoViajeTipoManejo | string;
  gestorReceptor?: string | null;
  destinoFinal?: string | null;
  numeroRegistro?: string | null;
  numeroCertificado?: string | null;
  archivoUrl?: string | null;
  activo: boolean;
}

export interface ResiduoViajeUpsertDto {
  projectId: number;
  autorizacionDmeId?: number | null;
  residuoTipoId: number;
  eoRsId: number;
  contratista?: string | null;
  origen?: ResiduoViajeOrigen | string | null;
  fecha: string;
  cantidadM3: number;
  cantidadTon?: number | null;
  tipoManejo: ResiduoViajeTipoManejo | string;
  gestorReceptor?: string | null;
  destinoFinal?: string | null;
  numeroRegistro?: string | null;
  numeroCertificado?: string | null;
}

export interface ResiduoViajeListFiltro {
  projectId?: number;
  residuoTipoId?: number;
  eoRsId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  tamanoPagina?: number;
}

export interface ResiduoViajePagedDto {
  items: ResiduoViajeDto[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}
