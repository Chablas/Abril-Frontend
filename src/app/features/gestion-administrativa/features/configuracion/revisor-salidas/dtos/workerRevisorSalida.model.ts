/** Un revisor asignado a un trabajador (fila viva de workers_revisores). */
export interface WorkerRevisorAsignadoDTO {
  /** workers_revisores_id */
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
 * Una fila por trabajador con correo @abril.pe, junto a sus n revisores ordenados
 * por prioridad. Sin revisores activos, sus solicitudes se envían al área de GTH.
 */
export interface WorkerRevisorSalidaItemDTO {
  workerId: number;
  fullName?: string;
  email?: string;
  categoryId?: number;
  category?: string;
  /** Nodo area_scope al que pertenece el trabajador (para el filtro por área). */
  areaScopeId?: number | null;
  revisores: WorkerRevisorAsignadoDTO[];
}

export interface WorkerRevisorSalidaOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

/** Nodo del árbol area_scope (lista plana; el frontend arma la jerarquía). */
export interface RevisorAreaNodeDTO {
  areaScopeId: number;
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaScopeParentId?: number | null;
  displayOrder: number;
}

/** Carga inicial de la página: tabla + opciones del selector + árbol de áreas. */
export interface RevisorSalidaInicialDTO {
  workers: WorkerRevisorSalidaItemDTO[];
  options: WorkerRevisorSalidaOptionDTO[];
  areaTree: RevisorAreaNodeDTO[];
}

/** Una asignación de revisor dentro del PUT. */
export interface WorkerRevisorAsignacionDTO {
  revisorWorkerId: number;
  ordenPrioridad: number;
  active: boolean;
}

/** Cuerpo del PUT: reemplaza el conjunto completo de revisores del trabajador. */
export interface WorkerRevisoresUpdateDTO {
  revisores: WorkerRevisorAsignacionDTO[];
}
