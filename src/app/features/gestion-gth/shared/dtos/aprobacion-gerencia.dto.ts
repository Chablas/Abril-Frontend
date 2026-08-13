/** Una vacante de la solicitud como la ve (y decide) Gerencia General. */
export interface AprobacionGgVacante {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  /** Tipo de requerimiento (Nuevo / Reemplazo). */
  tipoRequerimiento: string;
  proyectoObra: string | null;
  /** Fecha requerida de ingreso ("YYYY-MM-DD"). */
  fechaRequeridaIngreso: string;
  /** Decisión registrada: true = aprobada, false = rechazada, null = sin decidir. */
  aprobado: boolean | null;
}

/**
 * Página pública de decisión de Gerencia General (acceso por token, sin login): cabecera de la
 * solicitud + todas sus vacantes, en una sola petición.
 */
export interface AprobacionGgPublico {
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
  /** true cuando ya se decidió: la página se muestra en modo lectura. */
  decidida: boolean;
  /** Momento de la decisión (ISO, hora Perú). */
  decididoEn: string | null;
  comentario: string | null;
  vacantes: AprobacionGgVacante[];
}

/** Decisión de Gerencia General sobre una vacante concreta. */
export interface VacanteDecisionGg {
  requerimientoId: number;
  aprobado: boolean;
}

/** Payload de la decisión que envía Gerencia General. */
export interface AprobacionGgDecision {
  decisiones: VacanteDecisionGg[];
  comentario: string | null;
}

/** Resultado de registrar la decisión. */
export interface AprobacionGgDecisionResult {
  message: string;
  estadoCodigo: string;
  estadoNombre: string;
  aprobados: number;
  rechazados: number;
}

/** Resultado de reenviar el correo de aprobación al Gerente General. */
export interface AprobacionGgReenvioResult {
  message: string;
  destinatarios: string[];
}
