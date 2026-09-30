/** Modal «Documentos»: lo que el propietario ve en «Mis documentos» de la app Convivir Abril. */
export interface PropietarioDocumentosDto {
  tipos: PropietarioDocumentoTipoDto[];
  /** Sus propiedades vigentes, cada una con sus documentos (los más recientes primero). */
  propiedades: PropiedadDocumentosDto[];
}

export interface PropietarioDocumentoTipoDto {
  tipoId: number;
  nombre: string;
}

export interface PropiedadDocumentosDto {
  propietarioId: number;
  proyecto: string;
  torre: string | null;
  departamento: string;
  documentos: PropietarioDocumentoDto[];
}

export interface PropietarioDocumentoDto {
  documentoId: number;
  propietarioId: number;
  tipoId: number;
  tipo: string;
  nombre: string;
  /** Nombre del archivo que se subió: se descarga con ese nombre. */
  archivoNombre: string;
  tamanoBytes: number;
  /** Hora de Perú. */
  subidoEl: string;
  /** Hora de Perú. Primera vez que el propietario lo abrió en la app; null = todavía no. */
  leidoEl: string | null;
}

/** Un documento nuevo del Guardar; su archivo viaja aparte, en el mismo orden. */
export interface PropietarioDocumentoNuevoDto {
  propietarioId: number;
  tipoId: number;
  nombre: string;
}
