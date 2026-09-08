/**
 * Una fila de Configuración → Capturas: un nodo del árbol de áreas (`area_scope`) con el flag que
 * dice si sus trabajadores están obligados a subir capturas de movilidad para rendir una salida.
 *
 * Se listan todas las áreas activas, una fila por nodo y sin colapsar ramas: de
 * "Gerencia de Proyectos → Unidad de Proyectos → Planeamiento BIM / Ingeniería BIM" salen cuatro
 * filas independientes. `parentName` es lo que las distingue: hay nombres repetidos en ramas
 * distintas (dos "Producción", dos "Unidad de Proyectos").
 */
export interface GaCapturaAreaItemDto {
  areaScopeId: number;
  /** Nombre del nodo, sin la ruta completa de la rama. */
  areaName: string;
  areaTypeId: number;
  areaTypeName: string;
  /** Nombre del área padre. null = nodo raíz (una gerencia). */
  parentName: string | null;
  /** true = hay que subir una captura por trayecto para poder rendir. Es el default. */
  capturasObligatorias: boolean;
}

/** Opción del filtro "Tipo de área". */
export interface GaCapturaAreaTipoOptionDto {
  areaTypeId: number;
  areaTypeName: string;
}

/** Carga inicial de la sección: tabla + opciones de sus filtros en una sola petición. */
export interface GaCapturaAreaInicialDto {
  areas: GaCapturaAreaItemDto[];
  tipos: GaCapturaAreaTipoOptionDto[];
}

export interface GaCapturaAreaUpdateDto {
  capturasObligatorias: boolean;
}
