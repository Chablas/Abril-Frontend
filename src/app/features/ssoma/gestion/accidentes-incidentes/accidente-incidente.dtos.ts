export interface AccidenteIncidenteListItemDto {
  id: number;
  proyectoNombre: string;
  fecha: string;
  descripcion: string;
  tipo: string;
  estado: string;
  totalDocumentos: number;
  createdAt: string;
}

export interface DocumentoAdjuntoDto {
  id: number;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanioBytes: number;
  urlSharepoint: string;
  createdAt: string;
}

export interface AccidenteIncidenteDetalleDto {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  fecha: string;
  descripcion: string;
  tipo: string;
  estado: string;
  responsableId?: number;
  createdAt: string;
  updatedAt: string;
  documentos: DocumentoAdjuntoDto[];
}

export interface CrearAccidenteIncidenteRequest {
  proyectoId: number;
  fecha: string;
  descripcion: string;
  tipo: string;
  estado: string;
  responsableId?: number;
}

export interface ActualizarAccidenteIncidenteRequest {
  proyectoId: number;
  fecha: string;
  descripcion: string;
  tipo: string;
  estado: string;
  responsableId?: number;
}

export interface SubirDocumentoRequest {
  nombreArchivo: string;
  tipoArchivo: string;
  tamanioBytes: number;
  contenidoBase64: string;
}
