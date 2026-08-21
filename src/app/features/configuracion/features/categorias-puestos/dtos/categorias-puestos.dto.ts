/** Categoría del catálogo: es el campo que manda sobre entregables, permisos y filtros internos. */
export interface CategoriaAdminDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

/**
 * Puesto del catálogo único (reemplazó a la vieja "ocupación", cuya data se fusionó acá).
 * Cada puesto pertenece a exactamente una categoría, y esa es la categoría de todos los
 * trabajadores que lo tengan: el nombre del puesto no decide nada, pero su categoría sí.
 */
export interface PuestoAdminDto {
  id: number;
  nombre: string;
  /** Obligatoria. Es de acá de donde sale la categoría de cada trabajador con este puesto. */
  categoriaId: number;
  categoriaNombre: string | null;
  orden: number;
  activo: boolean;
  /**
   * Fichas de trabajadores que usan este puesto. Es lo que decide si se puede
   * eliminar: un puesto en uso solo se puede desactivar.
   */
  cantidadTrabajadores: number;
  /**
   * Áreas a las que pertenece el puesto. Puede estar en varias (CHOFER está en Logística y
   * en Gerencia General) y también en ninguna: los puestos de obra no tienen área porque el
   * padrón de GTH solo cubrió personal de oficina.
   */
  areas: PuestoAreaDto[];
}

/** Un área del puesto: el nodo de `area_scope` con su nombre ya resuelto. */
export interface PuestoAreaDto {
  areaScopeId: number;
  nombre: string;
}

/**
 * Nodo del árbol `area_scope` como lista plana; el frontend arma la jerarquía con
 * `areaScopeParentId`. Alimenta el filtro por área en cascada y el selector del modal.
 */
export interface AreaNodoDto {
  areaScopeId: number;
  areaScopeParentId: number | null;
  areaItemName: string;
  displayOrder: number;
}

/**
 * Fila del detalle "trabajadores de este puesto". Es una ficha de workers, no una persona:
 * quien reingresó tiene más de una y puede salir dos veces si ambas apuntan al mismo
 * puesto — a propósito, para que la lista cuadre con `cantidadTrabajadores`.
 */
export interface PuestoTrabajadorDto {
  workerId: number;
  nombreCompleto: string;
  emailCorporativo: string | null;
}

/** Carga inicial de la pantalla: las tres listas en una sola respuesta. */
export interface CatalogosAdminDto {
  categorias: CategoriaAdminDto[];
  puestos: PuestoAdminDto[];
  /** Árbol de áreas (lista plana) para el filtro en cascada y el selector del modal. */
  areaTree: AreaNodoDto[];
}

/** Alta/edición de un puesto: nombre, categoría (obligatoria) y sus áreas. */
export interface PuestoUpsertRequest {
  nombre: string;
  categoriaId: number;
  /**
   * Áreas del puesto. Es el estado COMPLETO, no un delta: lo que no venga se le quita al
   * puesto. Vacía = el puesto se queda sin área (válido: los de obra no tienen ninguna).
   */
  areaScopeIds: number[];
}

/**
 * Resultado de eliminar en bloque. `omitidos` son los seleccionados que quedaron con
 * trabajadores usándolos entre la carga de la pantalla y el envío: se saltan en vez de
 * hacer fallar todo el lote.
 */
export interface PuestosEliminarResultDto {
  eliminados: number;
  omitidos: number;
}
