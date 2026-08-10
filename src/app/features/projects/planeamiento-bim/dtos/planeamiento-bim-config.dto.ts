export interface NivelConfigDTO {
  id?: number | null;
  nombre: string;
  orden: number;
}

export interface SectorConfigDTO {
  id?: number | null;
  nombre: string;
  orden?: number;
}

export interface ZonaConfigDTO {
  id?: number | null;
  nombre: string;
  orden?: number;
  niveles: NivelConfigDTO[];
  sectores: SectorConfigDTO[];
}

export interface FaseConfigDTO {
  id: number;
  nombre: string;
  fechaInicio: string | null;
  fechaFinMeta: string | null;
}

export interface ResponsableBimWorkerDTO {
  id: number;
  apellidoNombre: string;
}

export interface PlaneamientoBimConfigDTO {
  projectId?: number;
  responsableId: number | null;
  responsableNombre?: string | null;
  metaPpc: number | null;
  zonas: ZonaConfigDTO[];
  fases: FaseConfigDTO[];
}
