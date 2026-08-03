import { CandidatoFormularioResumen } from './formulario-postulante.dto';

/** Opción genérica {id, nombre} para desplegables (p.ej. el catálogo de prioridades). */
export interface Opcion {
  id: number;
  nombre: string;
}

/** Contadores de las tarjetas de resumen de la vista de GTH (por ahora solo "En proceso"). */
export interface ResumenReclutamiento {
  /** Requerimientos activos actualmente (en curso dentro del pipeline). */
  enProceso: number;
}

/** Fila de la tabla "Solicitudes de contratación" (un requerimiento de cualquier área). */
export interface RequerimientoGthListItem {
  requerimientoId: number;
  /** Código REQ-AAAA-NNNN (columna "N° requerimiento"). */
  codigo: string;
  /** Área solicitante (snapshot al registrar). */
  area: string | null;
  /** Puesto solicitado. */
  puesto: string;
  /** Proyecto/obra destino de la vacante. */
  proyectoObra: string | null;
  /** Fecha en que llegó la solicitud (ISO, ya en hora Perú). Columna "Fecha llegada". */
  fechaLlegada: string;
  /** Fecha requerida de ingreso ("YYYY-MM-DD"). Columna "Fecha requerida". */
  fechaRequeridaIngreso: string;
  /** Prioridad asignada (id del catálogo). Null si no tiene. Columna "Prioridad". */
  prioridadId: number | null;
  /** Nombre de la prioridad (Alta/Media/Baja). Null si no tiene. */
  prioridadNombre: string | null;
  estadoCodigo: string;
  estadoNombre: string;
}

/** Respuesta de la bandeja de GTH: tarjetas + tabla + catálogos en una sola petición. */
export interface BandejaReclutamiento {
  resumen: ResumenReclutamiento;
  solicitudes: RequerimientoGthListItem[];
  /** Catálogo de prioridades (Alta/Media/Baja) para el desplegable de la columna. */
  prioridades: Opcion[];
}

// ── Detalle del requerimiento (modal del ojo de la bandeja) ──────────────────

/** Asignación interna de GTH de un requerimiento (null = sin asignar). */
export interface AsignacionGth {
  /** Id de gth_responsable_proceso (responsable del proceso). */
  responsableId: number | null;
  /** Id de gth_tipo_proceso (tipo de proceso y SLA). */
  tipoProcesoId: number | null;
  /** Id de gth_prioridad (prioridad interna). */
  prioridadId: number | null;
  /** Id de contributor (razón social activa). */
  contributorId: number | null;
}

/** Opción del desplegable "Tipo de proceso y SLA". */
export interface TipoProcesoOpcion {
  id: number;
  nombre: string;
  slaDias: number;
  descripcion: string | null;
}

/** Opción del desplegable "Razón social activa", con sus cupos disponibles. */
export interface RazonSocialOpcion {
  id: number;
  nombre: string;
  /** Cupos = tope (20) − trabajadores vigentes en la base maestra (practicantes no consumen). */
  cuposDisponibles: number;
}

/** Canal de publicación de vacantes y su estado para el requerimiento consultado. */
export interface CanalPublicacion {
  id: number;
  nombre: string;
  /** true = API disponible · publicación automática; false = registrar publicación manual. */
  apiDisponible: boolean;
  /** true = la vacante ya está registrada como publicada en este canal. */
  publicado: boolean;
}

/**
 * Estado resultante de una transición del pipeline (respuesta de publicar la vacante y de
 * iniciar la revisión de CV): actualiza el badge y las secciones del modal sin refetch.
 */
export interface EstadoTransicionResult {
  message: string;
  estadoCodigo: string;
  estadoNombre: string;
}

/** Detalle del requerimiento para la vista de GTH: cabecera + asignación + catálogos + canales. */
export interface DetalleRequerimientoGth {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  tipoRequerimiento: string;
  /** Vacantes de este requerimiento (cada vacante genera su propio requerimiento → 1). */
  vacantes: number;
  fechaRequeridaIngreso: string;
  estadoCodigo: string;
  estadoNombre: string;
  asignacion: AsignacionGth;
  responsables: Opcion[];
  tiposProceso: TipoProcesoOpcion[];
  prioridades: Opcion[];
  razonesSociales: RazonSocialOpcion[];
  canales: CanalPublicacion[];
  /**
   * Candidatos aprobados por el solicitante (solo relevante en la fase LONG_LIST_APROBADA).
   * Alimentan la vista "Long list aprobada" de GTH. Vacío en fases anteriores.
   */
  candidatosAprobados: CandidatoAprobado[];
}

/** Candidato aprobado por el solicitante, como lo ve GTH en la fase "Long list aprobada". */
export interface CandidatoAprobado {
  candidatoId: number;
  nombre: string;
  puesto: string | null;
  /** Estado del formulario de información del postulante (null si GTH aún no lo envió). */
  formulario?: CandidatoFormularioResumen | null;
}
