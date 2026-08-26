import { SolicitudDestinatarios } from '../../shared/dtos/destinatarios.dto';
import { CandidatoRechazado } from '../../shared/dtos/candidato-rechazado.dto';
import { Seleccionado } from '../../shared/dtos/seleccionado.dto';

export interface OpcionDto {
  id: number;
  nombre: string;
}

/**
 * Opción del desplegable "Tipo de requerimiento". Trae además el código estable del catálogo
 * porque el formulario cambia de forma según el tipo: al elegir Reemplazo aparece el desplegable
 * del trabajador reemplazado. Se compara por `codigo` y nunca por `nombre`, que es presentación.
 */
export interface TipoRequerimientoOpcion extends OpcionDto {
  /** `NUEVO` | `REEMPLAZO`. */
  codigo: string;
}

/** Código del tipo de requerimiento que obliga a decir a quién se reemplaza. */
export const TIPO_REQUERIMIENTO_REEMPLAZO = 'REEMPLAZO';

/**
 * Ítem del desplegable «Puesto». Trae el área a la que entra quien ocupe el puesto: el
 * solicitante ya no elige área, la decide el puesto que pide. `null` = el puesto no tiene
 * destino (los de obra) y el contratado entra al área del propio solicitante.
 */
export interface PuestoOpcion extends OpcionDto {
  areaDestino: string | null;
}

/** Datos del formulario "Nueva solicitud de personal" en una sola petición. */
export interface ReclutamientoFormDataDto {
  areaNombre: string | null;
  areaScopeId: number | null;
  maxVacantes: number;
  puestos: PuestoOpcion[];
  tiposRequerimiento: TipoRequerimientoOpcion[];
  proyectos: OpcionDto[];
  /**
   * Trabajadores entre los que se elige al reemplazado: los del área del solicitante y los de
   * cualquier área hija, incluido él mismo (pedir el reemplazo propio por renuncia o promoción es
   * un caso real). Vacía cuando el solicitante no tiene área registrada: en ese caso no hay de
   * dónde elegir y el campo deja de ser obligatorio.
   */
  trabajadoresArea: OpcionDto[];
  destinatarios: SolicitudDestinatarios;
  /**
   * true si la ficha del solicitante es de Gerencia General. Con esto el formulario avisa que una
   * solicitud **FFT** suya no pasa por la aprobación de Gerencia General —se estaría aprobando a
   * sí mismo— y va directo a GTH. Lo resuelve el backend por la categoría de su ficha, no por rol.
   */
  esGerenteGeneral: boolean;
  /**
   * A quién le llegaría el aviso a GTH de un pedido FFT del propio Gerente General. Solo viene
   * cuando `esGerenteGeneral`; en el resto de los casos el aviso es `destinatarios`.
   */
  destinatariosFft: SolicitudDestinatarios | null;
}

export interface VacanteCreateDto {
  /**
   * Puesto del catálogo: es el único origen posible. El solicitante no puede dar de alta puestos
   * nuevos desde este formulario — eso lo hace GTH en el catálogo de puestos.
   */
  puestoId: number | null;
  tipoRequerimientoId: number | null;
  /**
   * Trabajador al que reemplaza la vacante. Solo se envía en las de tipo Reemplazo (en las demás
   * va null); el backend revalida que pertenezca al área del solicitante o a un área hija.
   */
  reemplazaWorkerId: number | null;
  projectId: number | null;
  /**
   * Salario bruto mensual de la vacante, en soles. Obligatorio: es parte de lo que aprueban el
   * gerente del área y Gerencia General, y va en sus correos.
   */
  salarioBrutoMensual: number | null;
  /**
   * true = ingreso directo **FFT**: el solicitante ya sabe a quién quiere, así que la vacante
   * obliga a declarar nombre y correo personal del candidato y el proceso se salta publicación,
   * revisión de CV, long list, entrevistas y finalistas.
   */
  esFft: boolean;
  /** Nombre completo del candidato FFT. Obligatorio cuando `esFft`; null en el resto. */
  fftCandidatoNombre: string | null;
  /** Correo personal del candidato FFT (el buzón al que GTH le mandará su formulario). */
  fftCandidatoCorreo: string | null;
}

export interface SolicitudPersonalCreateDto {
  /**
   * Justificación general de la solicitud. Obligatoria: es el sustento que leen el gerente del área
   * y Gerencia General para aprobar, y va en el cuerpo de sus correos.
   */
  justificacion: string;
  vacantes: VacanteCreateDto[];
}

export interface SolicitudPersonalCreateResult {
  id: number;
  codigos: string[];
  /**
   * ¿Salió el correo que arranca el flujo? Normalmente el de aprobación al Gerente General; en el
   * FFT que registra el propio Gerente General, el aviso a GTH. false cuando no hay destinatarios
   * configurados o el envío falló: la solicitud queda esperando un reenvío.
   */
  correoGerenciaEnviado: boolean;
  /**
   * true = la solicitud no pasa por la aprobación de Gerencia General (la registró el propio
   * Gerente General y todas sus vacantes son FFT): el requerimiento nace ya en manos de GTH.
   */
  aprobacionGgOmitida: boolean;
  message: string;
}

/** Resultado de reenviar el correo de aprobación a Gerencia General. */
export interface AprobacionGgReenvioResult {
  message: string;
  /** Destinatarios principales a los que se envió (para mostrarlos en el mensaje). */
  destinatarios: string[];
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
 * Aprobación de la solicitud (primer paso del flujo), en sus dos niveles: el visto bueno del
 * gerente del área y la aprobación de Gerencia General, que es la obligatoria y la que manda las
 * vacantes a GTH. Null en los requerimientos anteriores a esa funcionalidad, que no pasaron por
 * ese paso.
 */
export interface AprobacionGgResumen {
  /** PENDIENTE / APROBADA / APROBADA_PARCIAL / RECHAZADA (decisión del GG sobre la solicitud). */
  estadoCodigo: string;
  estadoNombre: string;
  /** Decisión del GG sobre ESTA vacante: true = aprobada, false = rechazada, null = sin decidir. */
  aprobado: boolean | null;
  /** Estado del visto bueno del gerente del área sobre la solicitud completa. */
  gerenteAreaEstadoCodigo: string;
  gerenteAreaEstadoNombre: string;
  /** Visto bueno del gerente del área sobre ESTA vacante: true / false / null = no opinó. */
  aprobadoGerenteArea: boolean | null;
  /** Envío del correo a los gerentes (ISO, hora Perú). Null si nunca se pudo enviar. */
  enviadoEn: string | null;
  /** Momento de la decisión del GG (ISO, hora Perú). Null si sigue pendiente. */
  decididoEn: string | null;
  /** Momento del visto bueno del gerente del área (ISO, hora Perú). */
  gerenteAreaDecididoEn: string | null;
  /** Comentario del Gerente General. */
  comentario: string | null;
  /** Comentario del gerente del área. */
  gerenteAreaComentario: string | null;
}

/** Detalle de seguimiento de un requerimiento (modal "Estado del reclutamiento"). */
export interface Seguimiento {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  tipoRequerimiento: string;
  /**
   * true = ingreso directo **FFT**. `fases` ya viene sin los pasos que este flujo no recorre; esto
   * es para poder explicar en pantalla por qué el proceso es más corto.
   */
  esFft: boolean;
  /** Nombre del candidato FFT que nombró el solicitante. Null cuando no es FFT. */
  fftCandidatoNombre: string | null;
  area: string | null;
  proyectoObra: string | null;
  justificacion: string | null;
  /**
   * Salario bruto mensual declarado para la vacante, en soles. Null en los requerimientos
   * anteriores a que se pidiera el dato.
   */
  salarioBrutoMensual: number | null;
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
  /**
   * Candidatos rechazados a lo largo del proceso (los que rechazó el solicitante y los que
   * descartó GTH), con la etapa del rechazo. Incluye las long lists anteriores.
   */
  candidatosRechazados: CandidatoRechazado[];
  /**
   * Quién obtuvo el puesto (la decisión final que tomó el propio solicitante). Null mientras el
   * proceso no se haya cerrado con un seleccionado.
   */
  seleccionado: Seleccionado | null;
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
  /** Portafolio/anexos que GTH adjuntó además del CV (vacío si no cargó ninguno). */
  anexos: CandidatoAnexo[];
  /** Estado de revisión (PENDIENTE / APROBADO / RECHAZADO). */
  estadoCodigo: string;
  estadoNombre: string;
}

/** Un archivo del "Portafolio/Anexos" de un candidato de la long list. */
export interface CandidatoAnexo {
  anexoId: number;
  /** Nombre con el que GTH lo subió. */
  nombre: string;
  /** Link al archivo en SharePoint. Null si la subida no dejó url. */
  url: string | null;
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
  /**
   * Archivos que GTH adjuntó al informe (informe final y resultados de la evaluación de
   * conocimientos). Vacío si no subió ninguno: los dos son opcionales.
   */
  archivos: ArchivoInformeFinalista[];
}

/** Un archivo del informe del finalista, para abrirlo desde SharePoint. */
export interface ArchivoInformeFinalista {
  archivoId: number;
  /** Código del documento: 'INFORME_FINAL' | 'EVALUACION_CONOCIMIENTOS'. */
  tipoCodigo: string;
  /** Nombre visible del documento ("Informe final"). */
  tipoNombre: string;
  /** Nombre del archivo tal como lo subió GTH. */
  nombre: string;
  url: string | null;
}

/** Un finalista con el informe que GTH registró tras su entrevista. */
export interface Finalista {
  candidatoId: number;
  nombre: string;
  /** Puesto del requerimiento (el que registró el solicitante), no un dato por candidato. */
  puesto: string | null;
  /** Nombre y link del CV que cargó GTH en la long list (para "Ver CV completo"). */
  cvNombre: string | null;
  cvUrl: string | null;
  /**
   * Nombre y link del CV documentado que el propio postulante adjuntó en su formulario. null si
   * no llegó a subirlo. Se muestra junto al de GTH: la decisión final se toma viendo los dos.
   */
  cvPostulanteNombre: string | null;
  cvPostulanteUrl: string | null;
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
  /** Finalistas ordenados alfabéticamente por nombre. */
  finalistas: Finalista[];
  /**
   * Área a la que entra el seleccionado: la de destino del puesto del requerimiento. Define el
   * área de su ficha de pre-ingreso, con la que se resuelve su jefatura al programarle el EMO
   * de ingreso.
   *
   * Es informativa — no se elige. `null` cuando el puesto no tiene destino (los de obra): el
   * backend se cae al área del solicitante.
   *
   * El nombre es el del nodo, no la rama completa ("Unidad de Proyectos", no
   * "Gerencia de Proyectos › Unidad de Proyectos").
   */
  areaDestino: OpcionDto | null;
}

/**
 * Decisión final del solicitante sobre un finalista. El área a la que entra el seleccionado no
 * viaja: la decide el puesto que se pidió y la resuelve el backend.
 */
export interface FinalistaDecision {
  candidatoId: number;
  /** true = aprobar (el proceso pasa a EMO de ingreso); false = rechazar al finalista. */
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
  /**
   * Ficha de pre-ingreso creada en workers para el seleccionado. Es el id con el que GTH abre
   * la programación de su EMO de Ingreso. Null al rechazar, o si el candidato todavía no tiene
   * el formulario del postulante aprobado.
   */
  workerId?: number | null;
}
