export type EoRsTipoOperador = 'TRANSPORTISTA' | 'DISPOSICION_FINAL' | 'VALORIZACION' | 'COMERCIALIZADORA';
export type EoRsAmbitoGestion = 'MUNICIPAL' | 'NO_MUNICIPAL';

export interface ResiduoEoRsDto {
  id: number;
  ruc: string;
  razonSocial: string;
  tipoOperador: EoRsTipoOperador | string;
  numeroRegistroMinam?: string | null;
  vigenciaRegistro?: string | null;
  direccion?: string | null;
  ambitoGestion?: EoRsAmbitoGestion | string | null;
  activo: boolean;
}

export interface ResiduoEoRsUpsertDto {
  ruc: string;
  razonSocial: string;
  tipoOperador: EoRsTipoOperador | string;
  numeroRegistroMinam?: string | null;
  vigenciaRegistro?: string | null;
  direccion?: string | null;
  ambitoGestion?: EoRsAmbitoGestion | string | null;
  activo: boolean;
}

export interface ResiduoEoRsDocumentoDto {
  id: number;
  eoRsId: number;
  tipoDocumento: string;
  numero?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  archivoUrl?: string | null;
  cumple: boolean;
}

export interface ResiduoEoRsDocumentoUpsertDto {
  tipoDocumento: string;
  numero?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  cumple: boolean;
}
