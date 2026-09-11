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

/** Revisores de un proyecto dentro de un área "filtrada por proyecto". */
export interface AreaProyectoRevisoresDTO {
  projectId: number;
  projectName: string;
  revisores: AreaRevisorAsignadoDTO[];
  /**
   * El revisor que realmente le toca hoy a este proyecto: lo asignado al proyecto, si no lo
   * asignado al área, y si no el residente de la obra. Lo resuelve el backend con el mismo
   * algoritmo que decide a quién se le manda a aprobar una salida.
   */
  revisorEfectivoNombre?: string | null;
  /** Ver `RevisorEfectivoOrigen`. */
  revisorEfectivoOrigen?: RevisorEfectivoOrigen | null;
  /** Ficha del revisor efectivo, para que el filtro por revisor lo encuentre. Null en el fallback GTH. */
  revisorEfectivoWorkerId?: number | null;
}

/**
 * De dónde salió el revisor efectivo, VISTO DESDE ESTA FILA:
 * - `Personalizado`: alguien lo asignó a mano para esta área (o para esta área + este proyecto).
 * - `Algoritmo`: lo resolvió el sistema — lo dedujo de la estructura (el residente de la obra, el
 *   Jefe del área, el Gerente de la gerencia) o subió por el árbol hasta la configuración de OTRA
 *   área. Un revisor puesto a mano en la gerencia es `Algoritmo` para las áreas de más abajo: esas
 *   filas no tienen revisor propio y no deben leerse como si lo tuvieran.
 * - `Gth`: último recurso, el correo del área de GTH.
 */
export type RevisorEfectivoOrigen = 'Personalizado' | 'Algoritmo' | 'Gth';

/**
 * Una fila por área de tipo "Área de Gerencia" o "Área Estándar" que sea el primer
 * nodo de su mismo tipo en su rama del árbol de áreas, junto a sus n revisores
 * ordenados por prioridad. Estos revisores aplican a los trabajadores del área que
 * no tienen revisores propios en Revisores de Trabajadores.
 */
export interface AreaRevisorItemDTO {
  areaScopeId: number;
  areaName: string;
  /** Tipo del nodo: "Área de Gerencia" o "Área Estándar". */
  areaTypeName: string;
  /** Nombre del área padre (normalmente la gerencia). null = nodo raíz. */
  parentName?: string | null;
  /** Revisores a nivel de área (project_id NULL). */
  revisores: AreaRevisorAsignadoDTO[];
  /** true = el área se subdivide por proyecto (se muestran subfilas por proyecto). */
  filtraPorProyecto: boolean;
  /** TODOS los proyectos activos con su revisor efectivo (solo si filtraPorProyecto). */
  proyectos: AreaProyectoRevisoresDTO[];
  /**
   * El revisor que realmente le toca hoy a un trabajador de esta área: lo asignado acá si hay
   * algo, y si no lo que deduce el algoritmo (el Jefe del área, o el Gerente si es una gerencia),
   * subiendo por el árbol.
   */
  revisorEfectivoNombre?: string | null;
  revisorEfectivoOrigen?: RevisorEfectivoOrigen | null;
  /** Ficha del revisor efectivo, para que el filtro por revisor lo encuentre. Null en el fallback GTH. */
  revisorEfectivoWorkerId?: number | null;
}

export interface AreaRevisorOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

/** Carga inicial de la página: áreas configurables con sus revisores + opciones del selector. */
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

/**
 * Cuerpo del PUT: reemplaza el conjunto completo de revisores del área (projectId null)
 * o del proyecto dentro del área (projectId con valor).
 */
export interface AreaRevisoresUpdateDTO {
  /** null = revisores a nivel de área; con valor = revisores del proyecto dentro del área. */
  projectId?: number | null;
  revisores: AreaRevisorAsignacionDTO[];
}

/** Cuerpo del PUT de flag "filtrar por proyecto". */
export interface AreaFiltroProyectoUpdateDTO {
  filtraPorProyecto: boolean;
}
