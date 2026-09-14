/**
 * Ámbito de la visibilidad que se está configurando. Es el segmento del backend
 * (`api/v1/gestion-administrativa/configuracion/visibilidad/{ambito}`) y define sobre qué pantalla
 * aplica lo que se guarda: las dos conviven en la misma tabla sin pisarse.
 *  • `salidas`     → qué solicitudes de salida ve el trabajador en Gestión de Salidas.
 *  • `rendiciones` → qué planillas ve en Gestión de Rendiciones.
 */
export type VisibilidadAmbito = 'salidas' | 'rendiciones';

export interface VisibilidadWorkerItemDTO {
  workerId: number;
  fullName?: string;
  email?: string;
  categoryId?: number;
  category?: string;
  /** Nodo area_scope al que pertenece el trabajador (para filtrar por área). null = sin área. */
  areaScopeId?: number | null;
  /** Cuántos nodos area_scope tiene asignados (override). 0 = usa el algoritmo automático. */
  areasAsignadas: number;
}

/** Carga inicial de la sección: trabajadores (tabla) + árbol de áreas (filtro en cascada). */
export interface VisibilidadInicialDTO {
  workers: VisibilidadWorkerItemDTO[];
  areaTree: VisibilidadAreaNodeDTO[];
}

export interface VisibilidadAreaNodeDTO {
  areaScopeId: number;
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaScopeParentId?: number | null;
  displayOrder: number;
}

/**
 * Un área concedida. `incluyeDescendientes` va siempre en false: el modal marca el subárbol
 * completo casilla por casilla, así que lo que se guarda es la lista de áreas tal como se ve. El
 * campo sigue en el contrato porque las filas cargadas antes lo tienen en true y el backend las
 * sigue expandiendo.
 */
export interface VisibilidadAsignacionDTO {
  areaScopeId: number;
  incluyeDescendientes: boolean;
}

/**
 * Lo que los dos modales de un trabajador necesitan, en una sola llamada: lo que tiene cargado a
 * mano y lo que REALMENTE ve hoy.
 *
 * Van juntos porque cada modal los combina distinto: el de detalle muestra siempre `efectivas` (la
 * pregunta es "¿qué ve?", no "¿qué le cargaron?") y el de edición parte de `asignaciones` si las
 * hay y, si no, de `efectivas`, para que el trabajador sin configuración propia no abra el modal en
 * blanco sino sobre lo que hoy resuelve el algoritmo.
 */
export interface VisibilidadWorkerDetalleDTO {
  /** Override vivo del trabajador en este ámbito. Vacío = lo resuelve el algoritmo. */
  asignaciones: VisibilidadAsignacionDTO[];
  /**
   * Nodos que el trabajador ve hoy: el override si lo tiene y, si no, lo que deduce el algoritmo de
   * jerarquía. En los dos casos incluye las ramas donde es revisor o consolidador, que ve siempre.
   */
  efectivas: number[];
  /** true = lo de `efectivas` nace de un override cargado a mano. */
  esPersonalizado: boolean;
  /** true = ve TODO sin recorte por área (hoy, el personal de GTH). */
  veTodo: boolean;
}
