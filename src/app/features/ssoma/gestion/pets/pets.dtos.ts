export interface PetListItemDto {
  id: number;
  nombre: string;
  codigo?: string;
  activo: boolean;
  totalPasos: number;
  createdAt: string;
}

export interface PetPasoDto {
  id: number;
  parentId?: number | null;
  tipo: string; // subtitulo | paso | letra | guion
  descripcion: string;
  imagenUrl?: string;
  orden: number;
}

export interface PetDetalleDto {
  id: number;
  nombre: string;
  codigo?: string;
  sharepointUrl?: string;
  activo: boolean;
  pasos: PetPasoDto[];
}

export interface CrearPetRequest {
  nombre: string;
  codigo?: string;
  sharepointUrl?: string;
}

export interface ActualizarPetRequest {
  nombre: string;
  codigo?: string;
  sharepointUrl?: string;
  activo: boolean;
}

export interface CrearPetPasoRequest {
  descripcion: string;
  parentId?: number | null;
  tipo?: string; // subtitulo | paso | letra | guion — default 'paso'
  posicion?: number;
}

export interface ActualizarPetPasoRequest {
  descripcion: string;
  tipo: string;
}

export interface ReordenarPasosRequest {
  parentId?: number | null;
  pasoIds: number[];
}

// "indice" = posición original del párrafo en el Word (identificador estable).
// "parentIndice" referencia el "indice" de otro elemento de la MISMA respuesta —
// permite reconstruir subtítulos/jerarquía detectados automáticamente.
export interface ImportPasoPreviewDto {
  indice: number;
  parentIndice?: number | null;
  tipo: string; // subtitulo | paso | letra | guion
  texto: string;
  imagenBase64?: string;
}

export interface ImportParrafoDto {
  indice: number;
  parentIndice?: number | null;
  tipo: string;
  texto: string;
  imagenBase64?: string;
}

export interface PetsImportPreviewDto {
  seccionEncontrada: boolean;
  pasos: ImportPasoPreviewDto[];
  todosLosParrafos: ImportParrafoDto[];
}

export interface ImportPasoConfirmDto {
  indice: number;
  parentIndice?: number | null;
  tipo: string;
  texto: string;
  imagenBase64?: string;
}

export interface ConfirmarImportacionRequest {
  pasos: ImportPasoConfirmDto[];
}
