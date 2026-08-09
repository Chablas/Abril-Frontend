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
 * lo que quedará guardado si se elige el nodo) y el revisor que le tocaría al trabajador, así que
 * el formulario no replica ninguna regla ni pide nada más al cambiar de área.
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
  revisorNombre?: string | null;
  revisorEmail?: string | null;
  /** Revisor por proyecto, solo en áreas configuradas como "filtrar por proyecto". */
  revisoresPorProyecto: AreaArbolRevisorProyectoDto[];
}

export interface AreaArbolRevisorProyectoDto {
  proyectoId: number;
  revisorNombre?: string | null;
  revisorEmail?: string | null;
}

/**
 * Opción del desplegable que aparece al marcar "Jefe personalizado" en el formulario de
 * trabajadores: cualquier trabajador con correo corporativo @abril.pe, tenga o no usuario
 * del sistema.
 */
export interface JefeCandidatoDto {
  workerId: number;
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
