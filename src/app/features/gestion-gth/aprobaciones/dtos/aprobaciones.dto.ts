import { SolicitudDestinatarios } from '../../shared/dtos/destinatarios.dto';

/**
 * Nivel con el que el usuario entra a «Aprobaciones». Lo resuelve el backend desde la CATEGORÍA de
 * su ficha de trabajador, no desde su rol: el rol solo abre la pantalla.
 *
 * - `GERENTE_GENERAL`: ve todas las solicitudes. Su decisión es la obligatoria — manda las vacantes
 *   aprobadas a Gestión de Talento Humano.
 * - `GERENTE_AREA`: ve y decide solo las de su área hacia abajo. Su decisión es un visto bueno que
 *   queda registrado, pero no hace avanzar la solicitud.
 * - `NINGUNO`: entra a la pantalla, pero no hay solicitudes bajo su alcance.
 */
export type AprobacionNivel = 'GERENTE_GENERAL' | 'GERENTE_AREA' | 'NINGUNO';

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
  /** Visto bueno del gerente del área: true / false / null = no opinó. */
  aprobadoGerenteArea: boolean | null;
  /** Decisión de Gerencia General: true = aprobada, false = rechazada, null = sin decidir. */
  aprobadoGerenteGeneral: boolean | null;
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
  /** Visto bueno del gerente del área (no condiciona el avance de la solicitud). */
  gerenteArea: AprobacionNivelResumen;
  /** Decisión de Gerencia General (la que manda las vacantes a GTH). */
  gerenteGeneral: AprobacionNivelResumen;
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
  gerenteArea: AprobacionNivelResumen;
  gerenteGeneral: AprobacionNivelResumen;
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
