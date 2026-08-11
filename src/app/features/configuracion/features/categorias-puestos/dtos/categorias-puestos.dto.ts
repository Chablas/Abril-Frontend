/** Categoría del catálogo: es el campo que manda sobre entregables, permisos y filtros internos. */
export interface CategoriaAdminDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

/**
 * Puesto del catálogo único (reemplazó a la vieja "ocupación", cuya data se fusionó acá).
 * Cada puesto pertenece a una categoría: la categoría es lo que usa la lógica interna y
 * el puesto solo se muestra.
 */
export interface PuestoAdminDto {
  id: number;
  nombre: string;
  categoriaId: number | null;
  categoriaNombre: string | null;
  orden: number;
  activo: boolean;
}

/** Carga inicial de la pantalla: las dos listas en una sola respuesta. */
export interface CatalogosAdminDto {
  categorias: CategoriaAdminDto[];
  puestos: PuestoAdminDto[];
}

/** Alta/edición de un puesto: nombre + la categoría a la que pertenece. */
export interface PuestoUpsertRequest {
  nombre: string;
  categoriaId: number | null;
}
