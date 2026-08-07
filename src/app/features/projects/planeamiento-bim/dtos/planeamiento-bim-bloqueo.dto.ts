export interface BloqueoDto {
  id: number;
  projectId: number;
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION" | "CERRADO"
  fechaCreacion: string; // ISO 8601 con offset
  fechaActualizacion: string | null;
  fechaCierre: string | null;
}

export interface BloqueoCreateDto {
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION"
}

export interface BloqueoUpdateDto {
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION"
}
