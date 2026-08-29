export type TipoEstructura = 'SUBESTRUCTURA' | 'SUPERESTRUCTURA';

export interface SectorConfigDTO {
  id?: number | null;
  nombre: string;
  orden?: number;
}

export interface NivelConfigDTO {
  id?: number | null;
  nombre: string;
  orden: number;
  tipoEstructura: TipoEstructura | null;
  /**
   * Shape de solo lectura para Carga Diaria y Restricciones (GET /carga-diaria/{projectId}).
   * Configuración Inicial ya no usa este campo — ese feature migró al modelo de Torres
   * (ver TorreConfigDTO/NivelTorreDTO), sin sectores con nombre libre.
   */
  sectores: SectorConfigDTO[];
}

/**
 * Se mantiene tal cual (con `niveles[].sectores`) porque Carga Diaria y Restricciones todavía
 * consumen este shape desde GET /carga-diaria/{projectId} — endpoint que no cambia en esta
 * migración a Torres. NO agregar campos de Torre acá; el modelo nuevo vive en TorreConfigDTO.
 */
export interface ZonaConfigDTO {
  id?: number | null;
  nombre: string;
  orden?: number;
  niveles: NivelConfigDTO[];
}

export interface FaseConfigDTO {
  id: number;
  nombre: string;
  fechaInicio: string | null;
  fechaFinMeta: string | null;
}

export interface ResponsableBimWorkerDTO {
  id: number;
  apellidoNombre: string;
}

// ── Modelo de Torres (Configuración Inicial) ───────────────────────────────
// Reemplaza el modelo de Zonas/sectores con nombre libre: una Torre define cuántos
// sectores tiene por clasificación (Subestructura/Superestructura); cada Nivel solo
// declara su clasificación y el conteo de sectores se deriva del total de la Torre.

export interface NivelTorreDTO {
  id?: number | null;
  nombre: string;
  orden: number;
  tipoEstructura: TipoEstructura | null;
}

export interface TorreConfigDTO {
  id?: number | null;
  nombre: string;
  orden?: number;
  cantidadSectoresSubestructura: number | null;
  cantidadSectoresSuperestructura: number | null;
  niveles: NivelTorreDTO[];
}

export interface PlaneamientoBimConfigDTO {
  projectId?: number;
  responsableId: number | null;
  responsableNombre?: string | null;
  metaPpc: number | null;
  torres: TorreConfigDTO[];
  fases: FaseConfigDTO[];
}

// ── Payload de guardado (PUT /configuracion/{projectId}) ──────────────────

export interface NivelUpdateDto {
  id: number | null;
  nombre: string;
  orden: number;
  tipoEstructura: TipoEstructura | null;
}

export interface TorreUpdateDto {
  id: number | null;
  nombre: string;
  orden: number;
  cantidadSectoresSubestructura: number | null;
  cantidadSectoresSuperestructura: number | null;
  niveles: NivelUpdateDto[];
}

export interface PlaneamientoBimConfigUpdateDto {
  responsableId: number | null;
  // Meta PPC ya no se envía: es un estándar fijo administrado por el backend (Fase A).
  torres: TorreUpdateDto[];
  fases: { id: number; fechaInicio: string | null; fechaFinMeta: string | null }[];
}
