/**
 * Las dos pantallas que asignan PERSONAS A ÁREAS con el mismo algoritmo:
 *  • `revisores`      → quién aprueba las salidas de los trabajadores del área (Solicitud de
 *                       Salidas · Configuración).
 *  • `consolidadores` → quién, además del propio trabajador, puede adjuntar el Consolidado del S10
 *                       de sus planillas (Gestión de Rendiciones · Configuración).
 *
 * Comparten tabla, árbol, modal y contrato. La única diferencia es cuántos de los asignados quedan
 * vigentes: en revisores gana el primer activo, en consolidadores quedan todos.
 */
export type AsignacionAreaModo = 'revisores' | 'consolidadores';

/** Una persona asignada a mano a un área (fila viva de la tabla de asignaciones). */
export interface AreaAsignadoDTO {
  id: number;
  workerId: number;
  fullName?: string;
  email?: string;
  category?: string;
  /** 1 = primero. En revisores decide quién gana; en consolidadores solo ordena. */
  ordenPrioridad: number;
  /** false = no se considera (ej. ausencia temporal). */
  active: boolean;
}

/**
 * De dónde salió una persona vigente, VISTO DESDE ESTA FILA:
 * - `Personalizado`: alguien la asignó a mano para esta área (o para esta área + este proyecto).
 * - `Algoritmo`: la resolvió el sistema — la dedujo de la estructura (el residente de la obra, el
 *   Jefe del área, el Gerente de la gerencia) o subió por el árbol hasta la configuración de OTRA
 *   área. Alguien puesto a mano en la gerencia es `Algoritmo` para las áreas de más abajo.
 * - `Gth`: último recurso, el correo del área de GTH (solo en revisores).
 * - `Propio`: el propio trabajador (solo en consolidadores, y no aparece en esta pantalla).
 */
export type AreaEfectivoOrigen = 'Personalizado' | 'Algoritmo' | 'Gth' | 'Propio';

/** Una persona vigente hoy para el área o el proyecto. */
export interface AreaEfectivoDTO {
  /** Ficha, para que el filtro por persona la encuentre. Null en el fallback GTH. */
  workerId?: number | null;
  nombre?: string | null;
  origen?: AreaEfectivoOrigen | null;
}

/** Asignaciones de un proyecto dentro de un área "filtrada por proyecto". */
export interface AreaProyectoAsignacionesDTO {
  projectId: number;
  projectName: string;
  asignados: AreaAsignadoDTO[];
  efectivos: AreaEfectivoDTO[];
}

/**
 * Una fila por área de tipo "Área de Gerencia" o "Área Estándar" que sea el primer nodo de su
 * mismo tipo en su rama del árbol de áreas, con lo que tiene asignado y quién queda vigente.
 */
export interface AreaAsignacionItemDTO {
  areaScopeId: number;
  areaName: string;
  /** Tipo del nodo: "Área de Gerencia" o "Área Estándar". */
  areaTypeName: string;
  /** Nombre del área padre (normalmente la gerencia). null = nodo raíz. */
  parentName?: string | null;
  /** Asignado a nivel de área (project_id NULL). */
  asignados: AreaAsignadoDTO[];
  /** Quién queda vigente hoy para un trabajador de esta área. */
  efectivos: AreaEfectivoDTO[];
  /** true = el área se subdivide por proyecto (se muestran subfilas por proyecto). */
  filtraPorProyecto: boolean;
  /** TODOS los proyectos activos con lo suyo resuelto (solo si filtraPorProyecto). */
  proyectos: AreaProyectoAsignacionesDTO[];
}

export interface AreaWorkerOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

/** Carga inicial: áreas configurables + opciones del selector. */
export interface AreaAsignacionInicialDTO {
  areas: AreaAsignacionItemDTO[];
  options: AreaWorkerOptionDTO[];
}

/** Una asignación dentro del PUT. */
export interface AreaAsignacionInputDTO {
  workerId: number;
  ordenPrioridad: number;
  active: boolean;
}

/**
 * Cuerpo del PUT: reemplaza el conjunto completo del área (projectId null) o del proyecto dentro
 * del área (projectId con valor).
 */
export interface AreaAsignacionUpdateDTO {
  projectId?: number | null;
  asignados: AreaAsignacionInputDTO[];
}

/** Cuerpo del PUT del flag "filtrar por proyecto". */
export interface AreaFiltroProyectoUpdateDTO {
  filtraPorProyecto: boolean;
}
