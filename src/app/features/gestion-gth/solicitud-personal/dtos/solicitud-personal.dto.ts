export interface OpcionDto {
  id: number;
  nombre: string;
}

/** Datos del formulario "Nueva solicitud de personal" en una sola petición. */
export interface ReclutamientoFormDataDto {
  areaNombre: string | null;
  areaScopeId: number | null;
  maxVacantes: number;
  puestos: OpcionDto[];
  tiposRequerimiento: OpcionDto[];
  proyectos: OpcionDto[];
}

export interface VacanteCreateDto {
  puestoId: number | null;
  tipoRequerimientoId: number | null;
  projectId: number | null;
  /** Fecha requerida de ingreso en formato nativo "YYYY-MM-DD". */
  fechaRequeridaIngreso: string;
}

export interface SolicitudPersonalCreateDto {
  justificacion: string | null;
  vacantes: VacanteCreateDto[];
}

export interface SolicitudPersonalCreateResult {
  id: number;
  codigos: string[];
  /**
   * ¿Salió el correo de aprobación al Gerente General? false cuando no hay destinatarios
   * configurados o el envío falló: la solicitud queda esperando un reenvío.
   */
  correoGerenciaEnviado: boolean;
  message: string;
}

/** Una fase del pipeline dentro del seguimiento vertical del requerimiento. */
export interface FaseSeguimiento {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  /** Estado visual respecto a la fase actual: 'done' | 'current' | 'pending'. */
  estado: 'done' | 'current' | 'pending';
}

/**
 * Aprobación de Gerencia General de la solicitud (primer paso del flujo). Null en los
 * requerimientos anteriores a esa funcionalidad, que no pasaron por ese paso.
 */
export interface AprobacionGgResumen {
  /** PENDIENTE / APROBADA / APROBADA_PARCIAL / RECHAZADA (estado de la solicitud completa). */
  estadoCodigo: string;
  estadoNombre: string;
  /** Decisión sobre ESTA vacante: true = aprobada, false = rechazada, null = sin decidir. */
  aprobado: boolean | null;
  /** Envío del correo al GG (ISO, hora Perú). Null si nunca se pudo enviar. */
  enviadoEn: string | null;
  /** Momento de la decisión (ISO, hora Perú). Null si sigue pendiente. */
  decididoEn: string | null;
  comentario: string | null;
}

/** Detalle de seguimiento de un requerimiento (modal "Estado del reclutamiento"). */
export interface Seguimiento {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  tipoRequerimiento: string;
  area: string | null;
  proyectoObra: string | null;
  justificacion: string | null;
  /** Fecha requerida de ingreso ("YYYY-MM-DD"). */
  fechaRequeridaIngreso: string;
  /** Fecha de envío (ISO, ya en hora Perú). */
  enviado: string;
  estadoCodigo: string;
  estadoNombre: string;
  estadoOrden: number;
  /** Aprobación de Gerencia General de la solicitud (null en requerimientos previos a ese paso). */
  aprobacionGg: AprobacionGgResumen | null;
  sustentoNombre: string | null;
  sustentoUrl: string | null;
  fases: FaseSeguimiento[];
  /** Descripción de la fase actual (siguiente acción pendiente). */
  siguientePaso: string | null;
}

/** Fila de la tabla "Mis solicitudes de vacante" (un requerimiento del usuario). */
export interface SolicitudVacanteListItem {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  justificacion: string | null;
  area: string | null;
  proyectoObra: string | null;
  /** Fecha de envío (ISO, ya en hora Perú). */
  enviado: string;
  estadoCodigo: string;
  estadoNombre: string;
}

/**
 * Tarjeta de "Gestión de candidatos": un requerimiento sobre el que GTH le dejó algo por
 * revisar al solicitante. Hay dos tipos, distinguidos por `tipo`: la long list enviada
 * (con decisión de aprobar/rechazar) y el informe de finalistas (solo lectura).
 */
export interface GestionCandidatoCard {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  /** Cantidad de candidatos de la tarjeta (long list cargada o finalistas evaluados). */
  totalCandidatos: number;
  estadoCodigo: string;
  estadoNombre: string;
  /** 'LONG_LIST' = CVs por decidir; 'FINALISTAS' = informe de entrevistas de GTH. */
  tipo: 'LONG_LIST' | 'FINALISTAS';
}

/**
 * Contadores de las tarjetas resumen de la cabecera (el embudo del solicitante). Los calcula el
 * backend: qué fase le toca a quién es regla de negocio del pipeline, no del componente.
 */
export interface ResumenSolicitantePanel {
  /** "Mis solicitudes · Total registradas". */
  totalRegistradas: number;
  /** "Pendientes · Sin respuesta": siguen en la fase inicial, GTH todavía no los tomó. */
  pendientes: number;
  /** "En revisión · GTH evaluando": el siguiente paso le toca a GTH (sin contar el inicial). */
  enRevisionGth: number;
  /** "Aprobadas · Este período": procesos cerrados (finalista aprobado) del año en curso. */
  aprobadas: number;
}

/** Panel de la vista del solicitante: resumen + tarjetas de gestión de candidatos + tabla. */
export interface SolicitantePanel {
  resumen: ResumenSolicitantePanel;
  gestionCandidatos: GestionCandidatoCard[];
  misSolicitudes: SolicitudVacanteListItem[];
}

/** Un candidato de la long list como lo revisa el solicitante (modal "Revisar long list y CVs"). */
export interface CandidatoRevision {
  candidatoId: number;
  nombre: string;
  /** Puesto del requerimiento (el que registró el solicitante), no un dato por candidato. */
  puesto: string | null;
  comentario: string | null;
  /** Nombre y link del CV en SharePoint (para "Ver CV completo"). */
  cvNombre: string | null;
  cvUrl: string | null;
  /** Nombre y link del informe en SharePoint (opcional). */
  informeNombre: string | null;
  informeUrl: string | null;
  /** Estado de revisión (PENDIENTE / APROBADO / RECHAZADO). */
  estadoCodigo: string;
  estadoNombre: string;
}

/** Decisión del solicitante por candidato (aprobar/rechazar) que se envía a GTH. */
export interface CandidatoDecision {
  candidatoId: number;
  aprobado: boolean;
}

/** Resultado de registrar la decisión de la long list. */
export interface LongListDecisionResult {
  message: string;
  estadoCodigo: string;
  estadoNombre: string;
  aprobados: number;
  rechazados: number;
  /** true si el solicitante rechazó a todos los candidatos (0 aprobados). */
  todosRechazados: boolean;
}

/** Revisión de la long list de un requerimiento: cabecera + candidatos. */
export interface RevisionLongList {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  estadoCodigo: string;
  estadoNombre: string;
  candidatos: CandidatoRevision[];
}

/** Evaluación que GTH registró tras la entrevista de un finalista. */
export interface EvaluacionFinalista {
  /** Puntajes en porcentaje (0-100). null = GTH aún no lo registró. */
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
  /**
   * Resultado del candidato en el proceso: 'PENDIENTE' | 'PASO' (finalista en carrera) |
   * 'NO_PASO' (descartado por GTH) | 'SELECCIONADO' | 'RECHAZADO' (decisión del solicitante).
   */
  resultadoCodigo: string;
  resultadoNombre: string;
  agradecimientoCorreo: string | null;
  agradecimientoEnviadoEn: string | null;
  /** Momento de la decisión final del solicitante (ISO, hora Perú). Null si aún no decidió. */
  decididoEn: string | null;
}

/** Un finalista con el informe que GTH registró tras su entrevista. */
export interface Finalista {
  candidatoId: number;
  nombre: string;
  /** Puesto del requerimiento (el que registró el solicitante), no un dato por candidato. */
  puesto: string | null;
  /** Nombre y link del CV en SharePoint (para "Ver CV completo"). */
  cvNombre: string | null;
  cvUrl: string | null;
  evaluacion: EvaluacionFinalista;
}

/** Informe de finalistas de un requerimiento (modal "Finalistas enviados por GTH"). */
export interface RevisionFinalistas {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  estadoCodigo: string;
  estadoNombre: string;
  /** Finalistas ordenados por puntaje de resultado (mejor primero). */
  finalistas: Finalista[];
}

/** Decisión final del solicitante sobre un finalista. */
export interface FinalistaDecision {
  candidatoId: number;
  /** true = aprobar y cerrar el proceso; false = rechazar al finalista. */
  aprobado: boolean;
}

/** Resultado de registrar la decisión final sobre un finalista. */
export interface FinalistaDecisionResult {
  message: string;
  /** Estado en el que quedó el requerimiento tras la decisión. */
  estadoCodigo: string;
  estadoNombre: string;
  aprobado: boolean;
  /** true si ya no queda ningún finalista: el requerimiento vuelve a Long list / CVs. */
  todosRechazados: boolean;
  candidatoNombre: string;
}
