import { CandidatoFormularioResumen, FormularioCoincidencia } from './formulario-postulante.dto';
import { CandidatoRechazado } from '../../shared/dtos/candidato-rechazado.dto';
import { Seleccionado } from '../../shared/dtos/seleccionado.dto';
import { RazonSocialCupo } from '../../../../shared/dtos/razon-social.dto';

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

/**
 * Resultado de retomar el proceso con un candidato del historial de rechazados: además del nuevo
 * estado del requerimiento, desde qué etapa se lo retomó. La fase de destino no la elige GTH — la
 * decide la etapa del rechazo, porque retomar significa continuar justo desde ahí.
 */
export interface RetomarCandidatoResult extends EstadoTransicionResult {
  etapaCodigo: string;
  etapaNombre: string;
  candidatoNombre: string;
}

/** Detalle del requerimiento para la vista de GTH: cabecera + asignación + catálogos + canales. */
export interface DetalleRequerimientoGth {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  /**
   * Área a la que entra el contratado: la de destino del puesto pedido, que no siempre es la del
   * solicitante (la Gerencia Inmobiliaria pide un Ingeniero Residente y el residente entra a
   * Residencia). `null` = el puesto no tiene destino y entra al área del solicitante.
   */
  areaDestino: string | null;
  proyectoObra: string | null;
  tipoRequerimiento: string;
  /**
   * Trabajador al que reemplaza la vacante. Solo lo traen los requerimientos de tipo Reemplazo
   * registrados desde que se pide ese dato; null en el resto.
   */
  trabajadorReemplazado: string | null;
  /**
   * Salario bruto mensual que el área declaró para la vacante, en soles. Es el que Gerencia General
   * aprobó, así que es el punto de partida de la oferta. Null en los requerimientos anteriores a
   * que se pidiera el dato.
   */
  salarioBrutoMensual: number | null;
  /**
   * true = ingreso directo **FFT**: el requerimiento nace con su candidato puesto y se salta
   * publicación, revisión de CV, long list, entrevistas y finalistas. El modal usa esto para no
   * ofrecer los pasos que este flujo no tiene: al aprobar el formulario pasa directo al EMO.
   */
  esFft: boolean;
  /** Nombre del candidato FFT que nombró el solicitante. Null cuando no es FFT. */
  fftCandidatoNombre: string | null;
  /**
   * DNI del candidato FFT: sirve para saber a quién se le está mandando el formulario cuando hay
   * nombres parecidos, y es con el que ya quedó registrado en la base maestra al pedirse la
   * vacante. Null cuando no es FFT o el requerimiento es anterior a que se pidiera el dato.
   */
  fftCandidatoDocumento: string | null;
  /** Vacantes de este requerimiento (cada vacante genera su propio requerimiento → 1). */
  vacantes: number;
  estadoCodigo: string;
  estadoNombre: string;
  asignacion: AsignacionGth;
  responsables: Opcion[];
  tiposProceso: TipoProcesoOpcion[];
  prioridades: Opcion[];
  razonesSociales: RazonSocialCupo[];
  canales: CanalPublicacion[];
  /** Lugares donde se puede citar al candidato (desplegable de programación de entrevistas). */
  lugaresEntrevista: Opcion[];
  /**
   * Candidatos aprobados por el solicitante (solo relevante en la fase LONG_LIST_APROBADA).
   * Alimentan la vista "Long list aprobada" de GTH. Vacío en fases anteriores.
   */
  candidatosAprobados: CandidatoAprobado[];
  /**
   * Candidatos rechazados en cualquier etapa del proceso, incluidos los de long lists anteriores.
   * Alimentan la sección "Historial de candidatos rechazados".
   */
  candidatosRechazados: CandidatoRechazado[];
  /**
   * Quién obtuvo el puesto (decisión final del solicitante). Null mientras el proceso no cierre:
   * el frontend lo usa como bandera para mostrar el bloque "Puesto cubierto".
   */
  seleccionado: Seleccionado | null;
  /**
   * Carta oferta del seleccionado: el último paso del proceso, el que lo cierra. null mientras no
   * haya seleccionado. Con seleccionado y sin generar ni enviar nada todavía (`cartaOfertaId` en
   * null) trae solo los datos de destino, que es lo que la sección necesita para poder armarla.
   */
  cartaOferta: CartaOfertaRequerimiento | null;
}

/**
 * La carta oferta del seleccionado tal como la ve GTH en el detalle. Espejo de
 * `CartaOfertaRequerimientoDto`.
 */
export interface CartaOfertaRequerimiento {
  // ── Destino: sale de la ficha de la base maestra del seleccionado ──────────
  /** Nombre del colaborador (el de su ficha maestra, o el del candidato si aún no la tiene). */
  nombre: string;
  /**
   * Correo personal al que iría la carta (`person.email`). null = su ficha no lo tiene y hay que
   * escribirlo a mano en el modal.
   */
  correoSugerido: string | null;
  /**
   * Documento de identidad de esa misma ficha: es el que nombra su carpeta en el file de
   * colaboradores, así que null bloquea el envío.
   */
  dni: string | null;
  /** La firma que dibuja en el enlace se guarda en su ficha: sin ficha el envío queda bloqueado. */
  tieneFichaMaestra: boolean;

  // ── La carta: existe desde que se genera el borrador ───────────────────────
  /**
   * null = no hay carta ni borrador. Que tenga valor NO quiere decir que se haya enviado: para eso
   * está `enviadaEn`.
   */
  cartaOfertaId: number | null;
  /**
   * Fecha de ingreso pactada (`YYYY-MM-DD`). Es también la fecha de inicio de labores que imprime
   * la carta generada.
   */
  fechaIngreso: string | null;
  /** Sueldo ofrecido, tal como salió impreso. null si la carta se adjuntó ya armada. */
  sueldo: number | null;
  /** Hasta cuándo puede aceptar (`YYYY-MM-DD`). null si la carta se adjuntó ya armada. */
  fechaLimiteAceptacion: string | null;
  /**
   * Las condiciones de contrato que imprime la carta, una por viñeta y en orden. Vacía mientras no
   * se haya generado ningún borrador, y también en las cartas anteriores a la plantilla nueva: esas
   * llevan el bloque de condiciones escrito dentro del propio .docx.
   */
  condiciones: string[];

  // ── Borrador generado desde la plantilla (.docx) ───────────────────────────
  /** null = la carta no se generó acá. */
  generadaNombre: string | null;
  /** Enlace al Word en SharePoint: es lo que GTH abre para revisarlo (y corregirlo) antes de enviar. */
  generadaUrl: string | null;
  /** Momento de la última generación (ISO, ya en hora Perú). */
  generadaEn: string | null;

  // ── Envío: todo null mientras la carta no se haya enviado ──────────────────
  cartaNombre: string | null;
  cartaUrl: string | null;
  /** Correo al que se envió el enlace (el histórico del envío). */
  correo: string | null;
  /** Momento del último envío del enlace (ISO, ya en hora Perú). */
  enviadaEn: string | null;

  // ── Carta firmada ──────────────────────────────────────────────────────────
  firmadaNombre: string | null;
  firmadaUrl: string | null;
  firmadaSubidaEn: string | null;
  /**
   * Momento en que el CANDIDATO firmó desde el enlace público. Con valor, el documento vino de él y
   * GTH solo revisa; en null con `firmadaUrl` llena, lo subió GTH a mano.
   */
  firmadaPostulanteEn: string | null;
  /**
   * Cuándo el colaborador pulsó «Finalizar» en su enlace. Con valor, el documento firmado es el
   * DEFINITIVO: GTH ya no lo puede reemplazar, solo aprobarlo. Null en las cartas que se subieron
   * firmadas a mano y en las anteriores a que ese paso existiera.
   */
  finalizadaEn: string | null;
  /** Momento en que GTH la aprobó: es lo que cierra el requerimiento. */
  aprobadaEn: string | null;

  /** Carpeta de SharePoint donde vive el file digital del colaborador. */
  fileDigitalCarpeta: string | null;
}

/**
 * Lo que GTH pone a mano para que el sistema arme la carta oferta: las tres condiciones que el
 * documento no puede sacar solo de la base de datos. El resto de los datos —nombre, puesto,
 * jefatura, razón social— los resuelve el backend.
 */
export interface CartaOfertaGenerar {
  /** Fecha de inicio de labores (`YYYY-MM-DD`). Es la misma fecha de ingreso que hereda el onboarding. */
  fechaIngreso: string | null;
  /** Sueldo básico bruto mensual en soles. Lo define GTH, no sale del requerimiento. */
  sueldo: number | null;
  /** Hasta cuándo el candidato puede aceptar (`YYYY-MM-DD`). */
  fechaLimiteAceptacion: string | null;
  /**
   * Las condiciones de contrato, una por viñeta y en este orden. Las escribe GTH porque cambian con
   * el cargo (la jornada de staff de obra no es la de oficina, ni la condición laboral de un puesto
   * de confianza la de uno sin categoría). El backend descarta las vacías y exige al menos una.
   */
  condiciones: string[];
}

/** Datos del envío de la carta oferta (van como JSON en el multipart; la carta va como archivo). */
export interface CartaOfertaEnviar {
  fechaIngreso: string | null;
  /** Solo se manda si GTH corrigió a mano el correo que resolvió el backend. */
  correo: string | null;
}

/**
 * Resultado de cualquier acción sobre la carta oferta: la carta ya actualizada y la fase en la que
 * quedó el requerimiento. El modal repinta con esto sin volver a pedir el detalle entero.
 */
export interface CartaOfertaAccionResult extends EstadoTransicionResult {
  cartaOferta: CartaOfertaRequerimiento | null;
}

/** Candidato aprobado por el solicitante, como lo ve GTH en la fase "Long list aprobada". */
export interface CandidatoAprobado {
  candidatoId: number;
  nombre: string;
  puesto: string | null;
  /** Nombre y link del CV que GTH cargó en la long list de este candidato. */
  cvNombre: string | null;
  cvUrl: string | null;
  /**
   * Nombre y link del CV documentado que adjuntó el propio postulante al enviar su formulario.
   * null mientras no lo haya enviado. Va junto al de GTH porque el sentido de pedirlo es
   * comparar los dos.
   */
  cvPostulanteNombre: string | null;
  cvPostulanteUrl: string | null;
  /** Estado del formulario de información del postulante (null si GTH aún no lo envió). */
  formulario?: CandidatoFormularioResumen | null;
  /**
   * El documento que declaró el postulante ya existe en la base. Va en la ficha además del modal
   * porque los botones Aprobar/Rechazar también están acá: sin esto GTH podría aprobar sin haber
   * visto el aviso. Null cuando no coincide con nada.
   */
  coincidencia?: FormularioCoincidencia | null;
  /** true si GTH ya marcó el check informativo del Multitest de este candidato. */
  multitestRealizado: boolean;
  /** Correo del postulante al que se envía la invitación a la entrevista (null si aún no hay formulario). */
  correoContacto: string | null;
  /** Entrevista programada del candidato (null si aún no se programó). */
  entrevista?: EntrevistaResumen | null;
  /**
   * Evaluación de la entrevista (comentarios del informe y resultado). Null mientras GTH no
   * registre nada ni envíe el correo de agradecimiento.
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
  /**
   * Respuesta del candidato a la citación, la que dio desde los botones del correo:
   * 'CONFIRMADA' | 'RECHAZADA'. Null mientras no responda — que no es lo mismo que rechazar.
   * Al reprogramar se limpia: lo que había confirmado era la cita anterior.
   */
  respuestaCodigo: string | null;
  /** Nombre visible de la respuesta ("Confirmada por el candidato"). Null si aún no responde. */
  respuestaNombre: string | null;
  /** Momento en que el candidato respondió (ISO, ya en hora Perú). Null si aún no responde. */
  respondidoEn: string | null;
}

/** Resultado de programar/reprogramar una entrevista. */
export interface EntrevistaAccionResult {
  message: string;
  entrevista: EntrevistaResumen;
}

/**
 * Evaluación de la entrevista de un candidato: los tres comentarios del informe que ve el área
 * solicitante, más el resultado alcanzado.
 */
export interface EvaluacionResumen {
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
  /**
   * Archivos del informe ya subidos (informe final y resultados de la evaluación de
   * conocimientos). Vacío si GTH no subió ninguno: los dos son opcionales.
   */
  archivos: EvaluacionArchivo[];
}

/** Un archivo del informe de la entrevista, ya subido a SharePoint. */
export interface EvaluacionArchivo {
  archivoId: number;
  /** Código del documento: 'INFORME_FINAL' | 'EVALUACION_CONOCIMIENTOS'. */
  tipoCodigo: string;
  /** Nombre visible del documento ("Informe final"). */
  tipoNombre: string;
  /** Nombre del archivo con el que GTH lo subió. */
  nombre: string;
  /** Link al archivo en SharePoint. Null si la subida no dejó url. */
  url: string | null;
}

/** Códigos de los archivos del informe (espejo de gth_evaluacion_archivo_tipo.codigo). */
export const EVALUACION_ARCHIVO = {
  informeFinal: 'INFORME_FINAL',
  conocimientos: 'EVALUACION_CONOCIMIENTOS',
} as const;

/**
 * Body del guardado de la evaluación (solo comentarios; el resultado no se edita aquí).
 * Los tres comentarios son obligatorios: el informe completo es lo que el área solicitante
 * usa para decidir al finalista.
 */
export interface EvaluacionGuardar {
  comentarioEntrevista: string;
  comentarioPsicotecnico: string;
  comentarioRecomendacion: string;
  /**
   * Códigos de los archivos que GTH quitó del informe. Los que no vengan acá ni se manden como
   * archivo nuevo se quedan como estaban: volver a guardar no borra lo ya subido.
   */
  archivosQuitados?: string[];
}

/** Resultado de guardar la evaluación o de enviar el correo de agradecimiento. */
export interface EvaluacionAccionResult {
  message: string;
  evaluacion: EvaluacionResumen;

  /**
   * Fase nueva del requerimiento cuando la acción la movió: guardar la evaluación es enviar al
   * finalista, y eso lo pasa de Entrevistas a Selección jefatura. Null/ausente si la fase quedó
   * igual — el correo de agradecimiento nunca la mueve.
   */
  estadoCodigo?: string | null;
  estadoNombre?: string | null;
}
