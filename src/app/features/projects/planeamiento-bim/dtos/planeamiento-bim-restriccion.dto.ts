export interface RestriccionDto {
  id: number;
  projectId: number;
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION" | "CERRADO"
  fechaCreacion: string; // ISO 8601 con offset
  fechaActualizacion: string | null;
  fechaCierre: string | null;
  /** Fecha estimada de levantamiento, distinta de fechaCierre (que es la fecha de cierre real). */
  fechaLevantamientoPrevista: string | null;
  /** Ubicación exacta que afecta la restricción (Torre -> Nivel -> Sector derivado -> Actividad) — todos opcionales. */
  torreId: number | null;
  torreNombre: string | null;
  nivelId: number | null;
  nivelNombre: string | null;
  /** Número plano de sector (1..N), derivado de la clasificación del nivel y el conteo de la torre. */
  sector: number | null;
  actividadId: number | null;
  actividadNombre: string | null;
}

export interface RestriccionCreateDto {
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION"
  fechaLevantamientoPrevista: string | null;
  torreId: number | null;
  nivelId: number | null;
  sector: number | null;
  actividadId: number | null;
}

export interface RestriccionUpdateDto {
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION"
  fechaLevantamientoPrevista: string | null;
  torreId: number | null;
  nivelId: number | null;
  sector: number | null;
  actividadId: number | null;
}

// Aliases para compatibilidad con distintas convenciones
export type RestriccionDTO = RestriccionDto;
export type CrearRestriccionDTO = RestriccionCreateDto;
export type ActualizarRestriccionDTO = RestriccionUpdateDto;
