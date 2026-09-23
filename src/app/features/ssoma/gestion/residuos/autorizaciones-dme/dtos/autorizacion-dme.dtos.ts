export type AutorizacionDmeEstado = 'VIGENTE' | 'VENCIDA' | 'ANULADA';

export interface ResiduoAutorizacionDmeDto {
  id: number;
  projectId: number;
  municipalidad: string;
  numeroResolucion: string;
  escombreraDestinoId?: number | null;
  nombreEscombreraDestino?: string | null;
  vigenciaDesde: string;
  vigenciaHasta: string;
  placasAutorizadas?: string | null;
  estado: AutorizacionDmeEstado | string;
  archivoUrl?: string | null;
}

export interface ResiduoAutorizacionDmeUpsertDto {
  projectId: number;
  municipalidad: string;
  numeroResolucion: string;
  escombreraDestinoId?: number | null;
  vigenciaDesde: string;
  vigenciaHasta: string;
  placasAutorizadas?: string | null;
  estado: AutorizacionDmeEstado | string;
}
