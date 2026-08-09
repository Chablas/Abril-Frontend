import { CandidatoFormularioResumen } from './formulario-postulante.dto';

/** Opción genérica {id, nombre} para desplegables (p.ej. el catálogo de prioridades). */
export interface Opcion {
  id: number;
  nombre: string;
}

/** Contadores de las tarjetas de resumen de la vista de GTH. */
export interface ResumenReclutamiento {
  /** "En proceso · Activos actualmente": requerimientos vigentes que aún no se cierran. */
  enProceso: number;
  /** "Vacantes abiertas · Publicadas": ya publicadas en canales y todavía sin cerrar. */
  vacantesAbiertas: number;
  /** "Evaluaciones · Programadas": entrevistas agendadas cuyo resultado GTH aún no cierra. */
  evaluacionesProgramadas: number;
  /** "Procesos cerrados · Este período": requerimientos cerrados en el año en curso. */
  procesosCerrados: number;
  /** Solicitudes recién llegadas de jefatura (alimenta el aviso sobre el pipeline). */
  solicitudesNuevas: number;
}

/**
 * Una etapa del embudo "Pipeline de reclutamiento". El backend agrupa las 12 fases del catálogo
 * en estas etapas, así que la suma de los totales es el total de requerimientos vigentes.
 */
export interface PipelineEtapa {
  codigo: string;
  /** Nombre corto mostrado bajo el círculo (Solicitud, Publicado, …). */
  nombre: string;
  /** Requerimientos vigentes parados en esta etapa. */
  total: number;
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

/** Respuesta de la bandeja de GTH: tarjetas + pipeline + tabla + catálogos en una sola petición. */
export interface BandejaReclutamiento {
  resumen: ResumenReclutamiento;
  /** Etapas del embudo "Pipeline de reclutamiento", en orden. */
  pipeline: PipelineEtapa[];
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

/**
 * Canal de publicación de vacantes y su estado para el requerimiento consultado. No hay
 * integración con las APIs de los portales: el canal solo se marca para dejar registro de dónde
 * se publicó, la publicación siempre la hace GTH manualmente.
 */
export interface CanalPublicacion {
  id: number;
  nombre: string;
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
  /** Lugares donde se puede citar al candidato (desplegable de programación de entrevistas). */
  lugaresEntrevista: Opcion[];
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
  /** true si GTH ya marcó el check informativo del Multitest de este candidato. */
  multitestRealizado: boolean;
  /** Correo del postulante al que se envía la invitación a la entrevista (null si aún no hay formulario). */
  correoContacto: string | null;
  /** Entrevista programada del candidato (null si aún no se programó). */
  entrevista?: EntrevistaResumen | null;
  /**
   * Evaluación de la entrevista (puntajes, comentarios del informe y resultado). Null mientras
   * GTH no registre nada ni envíe el correo de agradecimiento.
   */
  evaluacion?: EvaluacionResumen | null;
}

/** Entrevista programada de un candidato (fecha, hora y lugar de la cita). */
export interface EntrevistaResumen {
  /** Fecha de la cita en formato `YYYY-MM-DD` (el que usa `app-date-picker`). */
  fecha: string;
  /** Hora de la cita en formato `HH:mm` 24h (el que usa `app-time-picker`). */
  hora: string;
  lugarId: number;
  lugarNombre: string;
  /** Correo al que se envió la invitación. */
  correoEnvio: string;
  /** Momento del último envío de la invitación (ISO, ya en hora Perú). Null si aún no se envió. */
  enviadoEn: string | null;
}

/** Resultado de programar/reprogramar una entrevista. */
export interface EntrevistaAccionResult {
  message: string;
  entrevista: EntrevistaResumen;
}

/**
 * Evaluación de la entrevista de un candidato: los cuatro puntajes que registra GTH y los tres
 * comentarios del informe que ve el área solicitante, más el resultado alcanzado.
 */
export interface EvaluacionResumen {
  /** Puntajes en porcentaje (0-100). null = aún sin registrar. */
  puntajeEntrevista: number | null;
  puntajePsicotecnico: number | null;
  puntajeTecnica: number | null;
  puntajeResultado: number | null;
  /** Resultado de la entrevista (qué se observó). */
  comentarioEntrevista: string | null;
  /** Informe psicotécnico del candidato. */
  comentarioPsicotecnico: string | null;
  /** Recomendación de GTH al área solicitante. */
  comentarioRecomendacion: string | null;
  /** Resultado alcanzado: 'PENDIENTE' | 'PASO' | 'NO_PASO'. */
  resultadoCodigo: string;
  resultadoNombre: string;
  /** Correo al que se envió el agradecimiento (null si no se envió). */
  agradecimientoCorreo: string | null;
  /** Momento del envío del agradecimiento (ISO, ya en hora Perú). Null si no se envió. */
  agradecimientoEnviadoEn: string | null;
}

/** Body del guardado de la evaluación (solo puntajes y comentarios; el resultado no se edita aquí). */
export interface EvaluacionGuardar {
  puntajeEntrevista: number | null;
  puntajePsicotecnico: number | null;
  puntajeTecnica: number | null;
  puntajeResultado: number | null;
  comentarioEntrevista: string | null;
  comentarioPsicotecnico: string | null;
  comentarioRecomendacion: string | null;
}

/** Resultado de guardar la evaluación o de enviar el correo de agradecimiento. */
export interface EvaluacionAccionResult {
  message: string;
  evaluacion: EvaluacionResumen;
}
