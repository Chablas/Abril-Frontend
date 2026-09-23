export interface ResiduoTipoDto {
  id: number;
  codigoSigersol?: string | null;
  nombre: string;
  esPeligroso: boolean;
  activo: boolean;
  factorVigente?: number | null;
}

export interface ResiduoTipoUpsertDto {
  codigoSigersol?: string | null;
  nombre: string;
  esPeligroso: boolean;
  activo: boolean;
}

export interface ResiduoTipoFactorDto {
  id: number;
  residuoTipoId: number;
  factorM3aTon: number;
  vigenciaDesde: string;
  vigenciaHasta?: string | null;
}

export interface ResiduoTipoFactorUpsertDto {
  factorM3aTon: number;
  vigenciaDesde: string;
  vigenciaHasta?: string | null;
}
