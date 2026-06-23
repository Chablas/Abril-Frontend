export type DossierEstadoSemana = 'Borrador' | 'Enviado' | 'Aprobado' | 'Rechazado' | 'NoAplica';
export type DossierEstadoDocumento = 'Pendiente' | 'Subido' | 'NA';
export type DossierTipoDocumento =
  | 'Accidente'
  | 'EPP'
  | 'Estadisticas'
  | 'Capacitaciones'
  | 'PETAR'
  | 'ATS'
  | 'Charlas';

export const DOSSIER_TIPOS: DossierTipoDocumento[] = [
  'Accidente',
  'EPP',
  'Estadisticas',
  'Capacitaciones',
  'PETAR',
  'ATS',
  'Charlas',
];

export interface DossierSemanaDto {
  id: number;
  contributorId: number;
  proyectoId: number;
  anio: number;
  numeroSemana: number;
  fechaInicio: string;
  fechaFin: string;
  estado: DossierEstadoSemana;
  obsRevisor: string | null;
  createdAt: string;
  totalDocs: number;
  subidos: number;
  na: number;
}

export interface DossierArchivoDto {
  id: number;
  nombreArchivo: string;
  archivoPath: string;
  createdAt: string;
}

export interface DossierDocumentoDto {
  id: number;
  dossierId: number;
  tipoDoc: DossierTipoDocumento;
  nombreArchivo: string | null;
  archivoPath: string | null;
  estado: DossierEstadoDocumento;
  createdAt: string;
  updatedAt: string | null;
  archivos: DossierArchivoDto[];
}

export interface DossierSemanaDetalleDto extends DossierSemanaDto {
  documentos: DossierDocumentoDto[];
}

export interface EnsureSemanaRequest {
  contributorId: number;
  proyectoId: number;
  numeroSemana: number;
  anio: number;
}

export interface RevisarDossierRequest {
  estado: string;
  obsRevisor?: string | null;
}
