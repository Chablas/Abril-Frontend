import { SolicitudDestinatarios } from '../../shared/dtos/destinatarios.dto';

/**
 * Nivel con el que el usuario entra a «Aprobaciones». Lo resuelve el backend desde la CATEGORÍA de
 * su ficha de trabajador, no desde su rol: el rol solo abre la pantalla.
 *
 * - `GERENTE_GENERAL`: ve todas las solicitudes y decide las vacantes NUEVAS y las FFT. Su firma
 *   sola las manda a Gestión de Talento Humano.
 * - `GERENTE_AREA`: ve las de su área hacia abajo y decide las de REEMPLAZO, junto con GTH.
 * - `GTH`: cualquier trabajador del área de Gestión del Talento Humano. Ve los reemplazos de toda
 *   la empresa y los decide junto con el gerente del área: hacen falta las dos firmas.
 * - `NINGUNO`: entra a la pantalla, pero no hay solicitudes bajo su alcance.
 */
export type AprobacionNivel = 'GERENTE_GENERAL' | 'GERENTE_AREA' | 'GTH' | 'NINGUNO';

/**
 * Por dónde se aprueba una vacante. Lo deriva el backend del tipo de requerimiento y del flag FFT:
 * - `GG`: solo Gerencia General (las vacantes nuevas y todas las FFT).
 * - `AREA_GTH`: el gerente del área Y GTH, las dos firmas (los reemplazos que no son FFT).
 */
export type RutaAprobacion = 'GG' | 'AREA_GTH';

/**
 * Una de las dos casillas de decisión de la solicitud (gerente del área o Gerencia General). Las
 * dos tienen la misma forma para poder pintarlas con el mismo bloque de plantilla.
 */
export interface AprobacionNivelResumen {
  /** PENDIENTE / APROBADA / APROBADA_PARCIAL / RECHAZADA. */
  estadoCodigo: string;
  estadoNombre: string;
  /** true cuando ese nivel ya decidió. */
  decidida: boolean;
  /** Momento de la decisión (ISO, hora Perú). */
  decididoEn: string | null;
  /** Quién decidió (null si sigue pendiente o si es anterior a esta pantalla). */
  decididoPor: string | null;
  comentario: string | null;
  vacantesAprobadas: number;
  vacantesRechazadas: number;
}

/** Una vacante de la solicitud, con la decisión de cada nivel. */
export interface AprobacionVacante {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  /** Tipo de requerimiento (Nuevo / Reemplazo). */
  tipoRequerimiento: string;
  /**
   * Trabajador al que reemplaza la vacante: es lo que le da sentido a un Reemplazo a la hora de
   * aprobarlo. Null en las vacantes nuevas y en las anteriores a este dato.
   */
  trabajadorReemplazado: string | null;
  proyectoObra: string | null;
  /**
   * Salario bruto mensual declarado para la vacante, en soles: es parte de lo que se está
   * aprobando. Null en las vacantes anteriores a que se pidiera el dato.
   */
  salarioBrutoMensual: number | null;
  /**
   * true = ingreso directo **FFT**: la vacante no se publica ni arma long list, el candidato ya
   * viene con nombre. Lo que se aprueba es a esa persona, así que la fila lo tiene que decir.
   */
  esFft: boolean;
  /** Nombre del candidato FFT que nombró el solicitante. Null en las vacantes normales. */
  fftCandidatoNombre: string | null;
  /**
   * DNI del candidato FFT: es lo único que lo identifica sin ambigüedad (dos candidatos pueden
   * llamarse igual) y con lo que ya quedó registrado en la base maestra. Null en las vacantes
   * normales y en los FFT anteriores a que se pidiera el dato.
   */
  fftCandidatoDocumento: string | null;
  /** Correo personal del candidato FFT. Null en las vacantes normales. */
  fftCandidatoCorreo: string | null;
  /** Código estable del tipo (`NUEVO` / `REEMPLAZO`): es lo que decide la `ruta`. */
  tipoRequerimientoCodigo: string;
  /** Por dónde se aprueba esta vacante. El modal solo deja marcar las de la ruta del usuario. */
  ruta: RutaAprobacion;
  /** Decisión del gerente del área: true / false / null = sin decidir. */
  aprobadoGerenteArea: boolean | null;
  /** Decisión de Gerencia General: true = aprobada, false = rechazada, null = sin decidir. */
  aprobadoGerenteGeneral: boolean | null;
  /** Decisión de GTH: true / false / null = sin decidir. Solo aplica en la ruta `AREA_GTH`. */
  aprobadoGth: boolean | null;
}

/** Detalle de una aprobación: cabecera de la solicitud, sus vacantes y las dos casillas. */
export interface AprobacionDetalle {
  aprobacionId: number;
  area: string | null;
  solicitanteNombre: string | null;
  justificacion: string | null;
  sustentoNombre: string | null;
  sustentoUrl: string | null;
  /** Fecha de registro de la solicitud (ISO, ya en hora Perú). */
  enviado: string;
  /** Decisión del gerente del área (una de las dos firmas de los reemplazos). */
  gerenteArea: AprobacionNivelResumen;
  /** Decisión de Gerencia General (la que mueve las vacantes nuevas y las FFT). */
  gerenteGeneral: AprobacionNivelResumen;
  /** Decisión de GTH (la otra firma de los reemplazos). */
  gth: AprobacionNivelResumen;
  /**
   * Qué firmas necesita ESTA solicitud, derivadas de los tipos de sus vacantes. La pantalla pinta
   * solo las casillas que hacen falta en vez de mostrar tres siempre, dos de ellas eternamente
   * pendientes sin que nadie las vaya a tocar.
   */
  requiereGerenteGeneral: boolean;
  requiereGerenteArea: boolean;
  requiereGth: boolean;
  /** Con qué poder entra el usuario que abrió el modal. */
  nivel: AprobacionNivel;
  /** true si todavía puede registrar SU decisión; false ⇒ el modal abre en lectura. */
  puedeDecidir: boolean;
  vacantes: AprobacionVacante[];
  /**
   * A quién le llegará el correo a Gestión de Talento Humano al confirmar. Lo resuelve el backend
   * con la misma lógica del envío, así que el aviso del modal no puede divergir del correo que
   * sale. Null salvo cuando quien abre es el Gerente General y aún no ha decidido: es el único
   * caso en que ese correo va a salir.
   */
  destinatarios: SolicitudDestinatarios | null;
}

/** Una solicitud en la lista de «Aprobaciones» (una fila = una solicitud de personal). */
export interface AprobacionListItem {
  aprobacionId: number;
  /** Códigos de las vacantes de la solicitud, separados por ", ". */
  codigos: string;
  area: string | null;
  solicitanteNombre: string | null;
  justificacion: string | null;
  /** Fecha de registro de la solicitud (ISO, hora Perú). */
  enviado: string;
  totalVacantes: number;
  /** Cuántas de esas vacantes le tocan al usuario que consulta (las de su ruta). */
  vacantesDeMiRuta: number;
  gerenteArea: AprobacionNivelResumen;
  gerenteGeneral: AprobacionNivelResumen;
  gth: AprobacionNivelResumen;
  /** Qué firmas necesita esta solicitud, derivadas de los tipos de sus vacantes. */
  requiereGerenteGeneral: boolean;
  requiereGerenteArea: boolean;
  requiereGth: boolean;
  /** true si esta fila espera la decisión del usuario que consulta. */
  esperaMiDecision: boolean;
}

/**
 * Contadores de las tarjetas. El backend los calcula SIEMPRE contra la casilla del usuario que
 * consulta: "por aprobar" es lo que espera SU firma, no la del otro nivel.
 */
export interface AprobacionesResumen {
  pendientes: number;
  vacantesPendientes: number;
  aprobadas: number;
  rechazadas: number;
}

/** Pantalla completa en una sola petición. */
export interface AprobacionesPanel {
  nivel: AprobacionNivel;
  /** Área de la que el usuario es gerente (solo con nivel GERENTE_AREA). */
  areaAlcance: string | null;
  resumen: AprobacionesResumen;
  aprobaciones: AprobacionListItem[];
}

/** Decisión sobre una vacante concreta. */
export interface VacanteDecision {
  requerimientoId: number;
  aprobado: boolean;
}

/**
 * Payload de la decisión. El nivel NO viaja acá: lo resuelve el backend desde la categoría del
 * usuario, para que nadie pueda pedir que su firma cuente como la del Gerente General.
 */
export interface AprobacionDecision {
  decisiones: VacanteDecision[];
  comentario: string | null;
}

/**
 * Decisión en bloque desde la lista: se aprueban (o rechazan) TODAS las vacantes de cada solicitud
 * seleccionada. El nivel con el que se registra tampoco viaja acá — lo resuelve el backend desde la
 * categoría de la ficha del usuario, así que la pantalla no puede pedir firmar como Gerencia General.
 */
export interface AprobacionDecisionMasiva {
  /** Solicitudes seleccionadas. */
  aprobacionIds: number[];
  /** true = aprobar todas sus vacantes; false = rechazarlas todas. */
  aprobado: boolean;
  /** Comentario opcional; queda igual en todas las solicitudes del lote. */
  comentario: string | null;
}

/**
 * Solicitud que quedó fuera del lote y por qué (ya la decidió alguien más de su mismo nivel, se dio
 * de baja, quedó fuera de alcance). No es un error: se muestran para que el conteo no quede sin
 * explicación.
 */
export interface AprobacionDecisionOmitida {
  aprobacionId: number;
  motivo: string;
}

/** Resultado de una decisión en bloque. */
export interface AprobacionDecisionMasivaResult {
  message: string;
  /** Nivel con el que se registró (GERENTE_GENERAL / GERENTE_AREA). */
  nivel: AprobacionNivel;
  /** Eco de lo pedido: true si el lote se aprobó, false si se rechazó. */
  aprobado: boolean;
  /** Solicitudes en las que la decisión quedó registrada. */
  solicitudes: number;
  /** Vacantes decididas en total. */
  vacantes: number;
  omitidas: AprobacionDecisionOmitida[];
}

/** Resultado de registrar la decisión. */
export interface AprobacionDecisionResult {
  message: string;
  /** Nivel con el que se registró (GERENTE_GENERAL / GERENTE_AREA). */
  nivel: AprobacionNivel;
  estadoCodigo: string;
  estadoNombre: string;
  aprobados: number;
  rechazados: number;
}
