export interface ResiduoConstanciaDto {
  id: number;
  projectId: number;
  eoRsId?: number | null;
  nombreEoRs?: string | null;
  contratista?: string | null;
  destino?: string | null;
  periodoAnio: number;
  periodoMes: number;
  numeroCertificado?: string | null;
  archivoUrl: string;
}

export interface ResiduoConstanciaUpsertDto {
  projectId: number;
  eoRsId?: number | null;
  contratista?: string | null;
  destino?: string | null;
  periodoAnio: number;
  periodoMes: number;
  numeroCertificado?: string | null;
}
