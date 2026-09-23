export type ResiduoDocumentoReferenciaTipo =
  | 'MANUAL_SIGERSOL'
  | 'MODELO_DECLARACION_JURADA'
  | 'MODELO_CARACTERISTICAS_RESIDUOS'
  | 'OTRO';

export interface ResiduoDocumentoReferenciaDto {
  id: number;
  tipo: ResiduoDocumentoReferenciaTipo | string;
  nombre: string;
  descripcion?: string | null;
  archivoUrl: string;
  version?: string | null;
  activo: boolean;
}

export interface ResiduoDocumentoReferenciaUpsertDto {
  tipo: ResiduoDocumentoReferenciaTipo | string;
  nombre: string;
  descripcion?: string | null;
  version?: string | null;
  activo: boolean;
}
