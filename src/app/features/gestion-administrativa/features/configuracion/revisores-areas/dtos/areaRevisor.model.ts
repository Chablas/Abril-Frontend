/** Un revisor asignado a un área (fila viva de area_revisores). */
export interface AreaRevisorAsignadoDTO {
  /** area_revisores_id */
  id: number;
  revisorWorkerId: number;
  revisorFullName?: string;
  revisorEmail?: string;
  revisorCategory?: string;
  /** 1 = primero en ser considerado; a mayor número, menor prioridad. */
  ordenPrioridad: number;
  /** false = no se considera (ej. ausencia temporal del revisor). */
  active: boolean;
}

/**
 * Una fila por área de tipo "Área Estándar" (solo el primer nodo estándar de cada
 * rama del árbol de áreas), junto a sus n revisores ordenados por prioridad.
 * Estos revisores aplican a los trabajadores del área que no tienen revisores
 * propios en Revisores de Trabajadores.
 */
export interface AreaRevisorItemDTO {
  areaScopeId: number;
  areaName: string;
  /** Nombre del área padre (normalmente la gerencia). null = nodo raíz. */
  parentName?: string | null;
  revisores: AreaRevisorAsignadoDTO[];
}

export interface AreaRevisorOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

/** Carga inicial de la página: áreas estándar con sus revisores + opciones del selector. */
export interface AreaRevisorInicialDTO {
  areas: AreaRevisorItemDTO[];
  options: AreaRevisorOptionDTO[];
}

/** Una asignación de revisor dentro del PUT. */
export interface AreaRevisorAsignacionDTO {
  revisorWorkerId: number;
  ordenPrioridad: number;
  active: boolean;
}

/** Cuerpo del PUT: reemplaza el conjunto completo de revisores del área. */
export interface AreaRevisoresUpdateDTO {
  revisores: AreaRevisorAsignacionDTO[];
}
