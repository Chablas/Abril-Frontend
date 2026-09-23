export interface ResiduoConstanciaFinalDto {
  id: number;
  projectId: number;
  fechaEmision: string;
  archivoUrl: string;
  observaciones?: string | null;
}

export interface ResiduoConstanciaFinalUpsertDto {
  projectId: number;
  fechaEmision: string;
  observaciones?: string | null;
}
