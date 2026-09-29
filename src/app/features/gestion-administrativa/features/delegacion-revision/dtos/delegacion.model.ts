/** Un revisor asignado (fila viva de area_actor_asignacion) mostrado en la delegación. */
export interface DelegacionRevisorAsignadoDTO {
  id: number;
  revisorWorkerId: number;
  revisorFullName?: string;
  revisorEmail?: string;
  revisorCategory?: string;
  ordenPrioridad: number;
  active: boolean;
}

/** Opción del selector: worker con correo corporativo @abril.pe de esa área/proyecto. */
export interface DelegacionOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

/**
 * Una asignación que el usuario administra: un área (projectId null) o un proyecto dentro
 * de un área "filtrada por proyecto" (projectId con valor), con sus revisores y las opciones
 * de trabajadores designables.
 */
export interface DelegacionAsignacionItemDTO {
  areaScopeId: number;
  areaName: string;
  parentName?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  /** Tipo de trabajador al que aplica (ids de `ga_actor_caso`): oficina central, staff… */
  casoId: number;
  casoNombre: string;
  revisores: DelegacionRevisorAsignadoDTO[];
  options: DelegacionOptionDTO[];
}

/** Carga inicial de la funcionalidad. */
export interface DelegacionInicialDTO {
  /** workers.id del usuario logueado (0 si no tiene worker). */
  currentWorkerId: number;
  asignaciones: DelegacionAsignacionItemDTO[];
}

/** Una asignación de revisor dentro del PUT. */
export interface DelegacionAsignacionDTO {
  revisorWorkerId: number;
  ordenPrioridad: number;
  active: boolean;
}

/** Cuerpo del PUT: reemplaza los revisores de una asignación (área o área+proyecto, y caso). */
export interface DelegacionUpdateDTO {
  projectId?: number | null;
  casoId: number;
  revisores: DelegacionAsignacionDTO[];
}
