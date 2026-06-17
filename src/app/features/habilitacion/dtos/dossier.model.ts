export type DossierEstadoSemana = 'Pendiente' | 'Enviado' | 'Observado' | 'Aprobado' | 'NoAplica';
export type DossierEstadoDocumento = 'Pendiente' | 'Subido' | 'NoAplica';
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
  semanaNumero: number;
  fechaInicio: string;
  fechaFin: string;
  estado: DossierEstadoSemana;
  comentarioSsoma: string | null;
  enviadoEn: string | null;
  revisadoEn: string | null;
}

export interface DossierDocumentoDto {
  id: number;
  tipoDocumento: DossierTipoDocumento;
  estado: DossierEstadoDocumento;
  archivoUrl: string | null;
  archivoNombre: string | null;
  justificacionNa: string | null;
  subidoEn: string | null;
}

export interface DossierSemanaDetalleDto extends DossierSemanaDto {
  documentos: DossierDocumentoDto[];
}
