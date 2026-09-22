/**
 * Contrato de la sección «Visibilidad»: qué áreas ve cada trabajador en una pantalla. Lo comparten
 * todas las pantallas que la tienen (Gestión de Salidas, Gestión de Rendiciones, Consolidados y
 * Solicitud de Personal): cada una expone los mismos tres endpoints bajo su propia URL, que es el
 * `endpoint` que recibe la sección.
 */

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
  /**
   * Obras de las que es hoy residente o administrador de obra: ve a todos sus trabajadores, con o
   * sin configuración propia. Solo lo manda Gestión Administrativa.
   */
  obras?: string[];
}

/** Una obra que el trabajador ve entera por estar a cargo de ella. */
export interface VisibilidadObraDTO {
  projectId: number;
  nombre: string;
  /** "Residente", "Administrador de obra" o los dos. */
  rol: string;
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
 * Un área concedida. `incluyeDescendientes` solo lo trae Gestión Administrativa, donde las filas
 * cargadas antes lo tienen en true y su backend las sigue expandiendo. Al guardar va siempre en
 * false: el modal marca el subárbol completo casilla por casilla, así que lo que se guarda es la
 * lista de áreas tal como se ve.
 */
export interface VisibilidadAsignacionDTO {
  areaScopeId: number;
  incluyeDescendientes?: boolean;
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
  /** Override vivo del trabajador en esta pantalla. Vacío = lo resuelve el algoritmo. */
  asignaciones: VisibilidadAsignacionDTO[];
  /**
   * Nodos que el trabajador ve hoy: el override si lo tiene y, si no, lo que deduce el algoritmo de
   * la pantalla (en Gestión Administrativa incluye además las ramas donde es revisor o
   * consolidador, que ve siempre).
   */
  efectivas: number[];
  /** true = lo de `efectivas` nace de un override cargado a mano. */
  esPersonalizado: boolean;
  /** true = ve TODO, sin recorte por área. */
  veTodo: boolean;
  /**
   * Obras de las que es residente o administrador de obra (solo Gestión Administrativa). Se suman a
   * `efectivas` y la configuración propia no las quita: salen del proyecto, así que pasan solas a
   * quien ocupe el puesto.
   */
  obras?: VisibilidadObraDTO[];
}
