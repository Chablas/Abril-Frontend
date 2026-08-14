import { SolicitudDestinatarios } from '../../shared/dtos/destinatarios.dto';

/** Una vacante de la solicitud como la ve (y decide) Gerencia. */
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
  /** Fecha requerida de ingreso ("YYYY-MM-DD"). */
  fechaRequeridaIngreso: string;
  /** Decisión registrada: true = aprobada, false = rechazada, null = sin decidir. */
  aprobado: boolean | null;
}

/** Detalle de una aprobación: cabecera de la solicitud + todas sus vacantes. */
export interface AprobacionDetalle {
  aprobacionId: number;
  area: string | null;
  solicitanteNombre: string | null;
  justificacion: string | null;
  sustentoNombre: string | null;
  sustentoUrl: string | null;
  /** Fecha de registro de la solicitud (ISO, ya en hora Perú). */
  enviado: string;
  /** PENDIENTE / APROBADA / APROBADA_PARCIAL / RECHAZADA. */
  estadoCodigo: string;
  estadoNombre: string;
  /** true cuando ya se decidió: el modal se muestra en modo lectura (historial). */
  decidida: boolean;
  /** Momento de la decisión (ISO, hora Perú). */
  decididoEn: string | null;
  /** Quién registró la decisión (null en las decididas antes de esta pantalla). */
  decididoPor: string | null;
  comentario: string | null;
  vacantes: AprobacionVacante[];
  /**
   * A quién le llegará el correo a Gestión de Talento Humano al confirmar la decisión. Lo resuelve
   * el backend con la misma lógica del envío, así que el aviso del modal no puede divergir del
   * correo que sale. Null en una solicitud ya decidida (no queda nada por enviar).
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
  estadoCodigo: string;
  estadoNombre: string;
  decidida: boolean;
  decididoEn: string | null;
  decididoPor: string | null;
  totalVacantes: number;
  vacantesAprobadas: number;
  vacantesRechazadas: number;
}

/** Contadores de las tarjetas de la pantalla. */
export interface AprobacionesResumen {
  pendientes: number;
  vacantesPendientes: number;
  aprobadas: number;
  rechazadas: number;
}

/** Pantalla completa en una sola petición. */
export interface AprobacionesPanel {
  resumen: AprobacionesResumen;
  aprobaciones: AprobacionListItem[];
}

/** Decisión de Gerencia sobre una vacante concreta. */
export interface VacanteDecision {
  requerimientoId: number;
  aprobado: boolean;
}

/** Payload de la decisión. */
export interface AprobacionDecision {
  decisiones: VacanteDecision[];
  comentario: string | null;
}

/** Resultado de registrar la decisión. */
export interface AprobacionDecisionResult {
  message: string;
  estadoCodigo: string;
  estadoNombre: string;
  aprobados: number;
  rechazados: number;
}
