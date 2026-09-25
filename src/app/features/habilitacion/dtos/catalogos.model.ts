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
 * Un nodo del árbol de áreas (`area_scope`) para los desplegables en cascada. El backend ya resuelve
 * por nodo la equivalencia legacy (`area`/`subarea`/`jefatura`, lo que quedará guardado si se elige
 * el nodo). Los actores de un trabajador ya no viajan acá: la ficha los pide con `getActores`.
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
}

/**
 * Una persona que cumple un actor. `workerId`/`personId` vienen en null en el último recurso (GTH),
 * que es un buzón de área y no una persona.
 */
export interface ActorPersonaTrabajadorDto {
  workerId?: number | null;
  personId?: number | null;
  nombre?: string | null;
  email?: string | null;
}

/**
 * Uno de los cinco actores de un trabajador (quién aprueba su salida, qué jefe se entera, quién
 * revisa su planilla, quiénes la consolidan y quiénes firman su consolidado): lo que le toca por su
 * área y lo personalizado en su ficha. La ficha no decide: muestra lo uno o lo otro.
 */
export interface ActorTrabajadorDto {
  /** Ids de `ga_actor`. */
  actorId: number;
  nombre: string;
  /** true = admite varias personas (consolidadores, aprobadores del consolidado). */
  multiple: boolean;
  /** false = no existe para este trabajador (el jefe notificado fuera del staff). */
  aplica: boolean;
  /** Lo que le toca sin lo personalizado de su ficha, en orden. */
  grupo: ActorPersonaTrabajadorDto[];
  /** De dónde sale `grupo`: 'Area' (Revisores de Áreas), 'Algoritmo' o 'Gth'. */
  grupoOrigen: string;
  /** Lo personalizado en la ficha, en orden. Vacío = no tiene. */
  personalizados: ActorPersonaTrabajadorDto[];
}

/** Los cinco actores de un trabajador y qué tipo de trabajador es (oficina central, staff…). */
export interface ActoresTrabajadorDto {
  casoId: number;
  casoNombre: string;
  actores: ActorTrabajadorDto[];
}

/**
 * Opción de los desplegables de personas de la sección de actores del formulario de trabajadores:
 * cualquier trabajador con correo corporativo @abril.pe, tenga o no usuario del sistema.
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
