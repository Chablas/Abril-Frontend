export interface SsItemTrabajadorDto {
  id: number;
  nombre: string;
  aplicaA: string;
  responsable: string;
  requiereVigencia: boolean;
  esSctrVidaley: boolean;
  orden: number;
  activo: boolean;
}

export interface SsItemEmpresaDto {
  id: number;
  nombre: string;
  responsable: string;
  orden: number;
  requiereVigencia: boolean;
  activo: boolean;
}

export interface ReglaDto {
  id: number;
  itemId: number;
  nombreItem?: string;
  categoriaId?: number;
  tipoTrabajador?: string;
  requerido: boolean;
  evaluadorRol?: string;
  nota?: string;
  activo: boolean;
}

export interface AreaCatDto {
  area: string;
}

export interface SubareaCatDto {
  id?: number;
  subarea: string;
  area: string;
  jefatura: string;
}

/**
 * Un nodo del árbol de áreas (`area_scope`) para los desplegables en cascada del formulario de
 * trabajadores. El backend ya resuelve por nodo la equivalencia legacy (`area`/`subarea`/`jefatura`,
 * lo que quedará guardado si se elige el nodo) y **el revisor ya elegido** que le tocaría al
 * trabajador, así que el formulario no replica ninguna regla ni pide nada más al cambiar de área:
 * lee `revisor`, o `revisorPorProyecto[proyecto]` si el área filtra por proyecto, y lo muestra.
 *
 * Elegir es parte del algoritmo y vive en el backend (`JefeRevisorResolver`), en el mismo lugar del
 * que sale el revisor al que se le manda a aprobar una salida. Si acá se vuelve a decidir algo, las
 * dos pantallas pueden volver a mostrar jefes distintos — que es el bug que esto cerró.
 */
export interface AreaArbolNodoDto {
  areaScopeId: number;
  areaScopeParentId: number | null;
  areaItemName: string;
  /** "Área de Gerencia" / "Área Estándar". */
  areaTypeName: string;
  displayOrder: number;
  area?: string | null;
  subarea?: string | null;
  jefatura?: string | null;
  /**
   * El revisor que le toca a un trabajador de este nodo, ya elegido por el backend descartando al
   * propio trabajador cuando el árbol se pidió con `workerId`. Null si la rama no tiene ninguno.
   */
  revisor?: AreaArbolRevisorDto | null;
  /**
   * True cuando el primer candidato de la rama era el propio trabajador y por eso `revisor` es el
   * siguiente. Lo normal en los jefes de área, que son el revisor de su propia área: el formulario
   * lo avisa para que no se lea como un error de configuración.
   */
  esRevisorDeSuPropiaArea: boolean;
  /** El revisor por proyecto, solo en áreas configuradas como "filtrar por proyecto". */
  revisorPorProyecto: AreaArbolRevisorProyectoDto[];
}

/**
 * Un revisor. `workerId`/`personId` vienen en null cuando el revisor es el área de GTH (el
 * fallback), que es un correo de área y no una persona.
 */
export interface AreaArbolRevisorDto {
  workerId?: number | null;
  personId?: number | null;
  nombre?: string | null;
  email?: string | null;
}

export interface AreaArbolRevisorProyectoDto {
  proyectoId: number;
  revisor?: AreaArbolRevisorDto | null;
  esRevisorDeSuPropiaArea: boolean;
}

/**
 * Opción del desplegable que aparece al marcar "Jefe personalizado" en el formulario de
 * trabajadores: cualquier trabajador con correo corporativo @abril.pe, tenga o no usuario
 * del sistema.
 */
export interface JefeCandidatoDto {
  workerId: number;
  /** Persona del candidato (una persona puede tener varias fichas en `workers` por reingreso). */
  personId?: number | null;
  fullName?: string | null;
  email?: string | null;
}

/**
 * Opción del catálogo workers_obra_oficina_staff: Obra / Staff / Oficina Central.
 * Sustituye a la lista hardcodeada del formulario de trabajadores y al antiguo
 * tipo de área "Área Obra_Oficina".
 */
export interface ObraOficinaStaffDto {
  obraOficinaStaffId: number;
  name: string;
}

/**
 * Ítem del catálogo de puestos. Lleva `categoriaId` para filtrar el desplegable sin volver al
 * servidor, y `areaDestinoScopeId` porque el área del trabajador ya no se elige: se deriva del
 * puesto (es "el área a la que va", no la que puede pedirlo). `areaDestinoScopeId` en null = el
 * puesto no tiene área de destino configurada, que es un caso válido (los puestos de obra no
 * tienen ninguna).
 */
export interface PuestoCatDto {
  id: number;
  nombre: string;
  categoriaId: number;
  areaDestinoScopeId: number | null;
}

/** Catálogo de tipos de equipo (Volquete, Excavadora de Oruga, ...) para el formulario de equipos. */
export interface TipoEquipoDto {
  id: number;
  nombre: string;
}

export interface TipoEquipoAdminDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

/** Ítem/entregable exigido a un equipo. tipoEquipoId null = genérico (aplica a todos los tipos). */
export interface ItemEquipoAdminDto {
  id: number;
  nombre: string;
  requiereVigencia: boolean;
  orden: number;
  activo: boolean;
  tipoEquipoId: number | null;
  tipoEquipoNombre: string | null;
}

export interface ItemEquipoUpsertRequest {
  nombre: string;
  requiereVigencia: boolean;
  tipoEquipoId: number | null;
}
