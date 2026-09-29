/**
 * Gestión Administrativa → Configuración → Revisores de Áreas.
 *
 * Los cinco ACTORES del ciclo de una salida (ids de `ga_actor`): quién aprueba la salida, qué jefe
 * se entera, quién aprueba la 1.ª revisión de la planilla, quiénes la consolidan y quiénes firman el
 * consolidado. Se resuelven por CASO (ids de `ga_actor_caso`): oficina central, staff,
 * administrador de obra, jefe, residente y subgerente.
 */

/** Ids de `ga_actor` (idénticos en dev y prod). */
export const ActorIds = {
  AprobadorSalida: 1,
  JefeNotificado: 2,
  AprobadorPrimeraRevision: 3,
  Consolidador: 4,
  AprobadorConsolidado: 5,
} as const;

/** Ids de `ga_actor_caso` (idénticos en dev y prod). */
export const ActorCasoIds = {
  OficinaCentral: 1,
  Staff: 2,
  Jefe: 3,
  Residente: 4,
  Subgerente: 5,
  AdministradorObra: 6,
} as const;

/**
 * De dónde sale el valor de una celda, VISTO DESDE SU FILA:
 * - `Personalizado`: se asignó en esta fila.
 * - `PersonalizadoArea`: una subfila de obra que hereda lo asignado a su área.
 * - `Algoritmo`: lo dedujo el sistema (o lo asignado en otra área, que le llega subiendo por el árbol).
 * - `Gth`: último recurso, el buzón de GTH.
 */
export type ActorOrigen = 'Personalizado' | 'PersonalizadoArea' | 'Algoritmo' | 'Gth';

export interface CatalogoActorDTO {
  id: number;
  nombre: string;
  /** Solo en actores: true = cuentan todos los de la lista. */
  multiple: boolean;
}

export interface ActorPersonaDTO {
  /** Null en el último recurso (GTH), que es un buzón de área. */
  workerId?: number | null;
  nombre?: string | null;
  email?: string | null;
  categoria?: string | null;
}

/** El valor que HOY tiene un actor para un caso de una fila. */
export interface ActorCeldaDTO {
  actorId: number;
  /** false = el actor no existe para este caso (el jefe notificado fuera del staff). */
  aplica: boolean;
  personas: ActorPersonaDTO[];
  /** En una fila sin obra, lo que depende de la obra se describe ("Residente de la obra"). */
  descriptor?: string | null;
  origen: ActorOrigen;
}

export interface RevisoresAreaProyectoDTO {
  projectId: number;
  projectName: string;
  /** false = OFICINA CENTRAL. */
  esObra: boolean;
  /** El caso de las columnas de esta subfila. */
  casoId: number;
  actores: ActorCeldaDTO[];
}

export interface RevisoresAreaFilaDTO {
  areaScopeId: number;
  areaName: string;
  areaTypeName: string;
  parentName?: string | null;
  esGerencia: boolean;
  /** Deducido: la gente del área trabaja en más de una ubicación (o hay algo por obra). */
  filtraPorProyecto: boolean;
  /** El caso de las columnas de esta fila (oficina central). */
  casoId: number;
  actores: ActorCeldaDTO[];
  proyectos: RevisoresAreaProyectoDTO[];
}

export interface PersonaOpcionDTO {
  workerId: number;
  fullName?: string | null;
  email?: string | null;
}

export interface RevisoresAreasInicialDTO {
  actores: CatalogoActorDTO[];
  casos: CatalogoActorDTO[];
  areas: RevisoresAreaFilaDTO[];
  options: PersonaOpcionDTO[];
  puedeEditar: boolean;
}

export interface AsignadoDTO {
  workerId: number;
  fullName?: string | null;
  email?: string | null;
  categoria?: string | null;
  ordenPrioridad: number;
  active: boolean;
}

export interface ActorCeldaDetalleDTO extends ActorCeldaDTO {
  /** false = no se puede personalizar (el actor no aplica a este caso). */
  editable: boolean;
  /** Lo personalizado EXACTAMENTE en esta fila, en orden. Vacía = no está personalizada acá. */
  asignados: AsignadoDTO[];
  /** Con la celda personalizada acá: lo que quedaría sin eso. */
  sinPersonalizar?: ActorCeldaDTO | null;
}

export interface RevisoresAreaCasoDTO {
  casoId: number;
  casoNombre: string;
  actores: ActorCeldaDetalleDTO[];
}

export interface RevisoresAreaDetalleDTO {
  areaScopeId: number;
  areaName: string;
  esGerencia: boolean;
  projectId?: number | null;
  projectName?: string | null;
  esObra: boolean;
  casos: RevisoresAreaCasoDTO[];
}

export interface AsignadoInputDTO {
  workerId: number;
  active: boolean;
}

export interface CeldaGuardarDTO {
  casoId: number;
  actorId: number;
  /** En orden: la posición es la prioridad. Vacía = sin personalizar. */
  asignados: AsignadoInputDTO[];
}

export interface RevisoresAreaGuardarDTO {
  projectId?: number | null;
  celdas: CeldaGuardarDTO[];
}
