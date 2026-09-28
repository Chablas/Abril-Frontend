import { TorreConfigDTO } from './planeamiento-bim-config.dto';
import { RestriccionDto } from './planeamiento-bim-restriccion.dto';

export interface ActividadCatalogoDto {
  id: number;
  macroActividadId: number;
  macroActividadNombre: string;
  nombre: string;
  tipo: string;
  orden: number;
}

export interface CausaCatalogoDto {
  id: number;
  nombre: string;
  orden: number;
}

export interface CeldaDto {
  torreId: number;
  nivelId: number;
  /** Número plano de sector (1..N), derivado de la clasificación del nivel y el conteo de
   *  la torre — ya no es el id de una entidad "sector" con nombre libre. */
  sectorId: number;
  actividadId: number;
  cumplida: boolean | null;
  causaId: number | null;
  causaNombre: string | null;
  causaDetalle: string | null;
}

export interface EvidenciaFotoDto {
  id: number;
  url: string;
  createdDateTime: string;
}

export interface CargaDiariaDto {
  fecha: string;
  /** Categoría de "evidencias" en esta respuesta ("GENERAL" | "PROCURA") — el resto
   *  del payload (grid, catálogos, bloqueos) no está scoped por categoría. */
  categoria: string;
  esEditable: boolean;
  torres: TorreConfigDTO[];
  actividades: ActividadCatalogoDto[];
  causas: CausaCatalogoDto[];
  celdas: CeldaDto[];
  evidencias: EvidenciaFotoDto[];
  restriccionesActivas: RestriccionDto[];
}

export interface CeldaUpdateDto {
  torreId: number;
  nivelId: number;
  sectorId: number;
  actividadId: number;
  cumplida: boolean;
  causaId: number | null;
  causaDetalle: string | null;
}

export interface CargaDiariaUpdateDto {
  celdas: CeldaUpdateDto[];
}
