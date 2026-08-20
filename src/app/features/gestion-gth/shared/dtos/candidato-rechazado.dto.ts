/**
 * Historial de candidatos rechazados de un requerimiento. Vive acá porque lo usan dos features del
 * módulo, cada una en su propia pantalla del mismo dato: «Reclutamiento» (el detalle que ve GTH) y
 * «Solicitud de Personal» (el «Estado del reclutamiento» que ve el área solicitante).
 */

/** Etapa del proceso en la que se rechazó al candidato. */
export type EtapaRechazo = 'LONG_LIST' | 'FORMULARIO' | 'ENTREVISTAS' | 'DECISION_FINAL';

/** Quién tomó el rechazo: el área usuaria o GTH. */
export type RechazadoPor = 'SOLICITANTE' | 'GTH';

/**
 * Un candidato que quedó rechazado en algún punto del proceso, con la etapa del rechazo. Incluye
 * los de long lists anteriores: cuando el solicitante rechaza a todos, el requerimiento vuelve a
 * Long list y estos son los que hay que poder consultar para no volver a presentar a los mismos.
 */
export interface CandidatoRechazado {
  candidatoId: number;
  nombre: string;
  /** Puesto del requerimiento al cargar la long list (snapshot), no un dato por candidato. */
  puesto: string | null;
  /**
   * En qué long list del requerimiento estaba (1 = la primera). Sin esto, dos rechazados en la
   * etapa "Long list" de vueltas distintas se leen igual.
   */
  numeroLongList: number;
  /** 'LONG_LIST' | 'FORMULARIO' | 'ENTREVISTAS' | 'DECISION_FINAL'. */
  etapaCodigo: EtapaRechazo;
  /** Nombre de la etapa ("Long list", "Formulario", "Entrevistas", "Decisión final"). */
  etapaNombre: string;
  /** 'SOLICITANTE' | 'GTH'. */
  rechazadoPorCodigo: RechazadoPor;
  /** "Área solicitante" / "GTH". */
  rechazadoPorNombre: string;
  /** Momento del rechazo (ISO, ya en hora Perú). */
  rechazadoEn: string;
  /** Comentario interno que GTH registró sobre el candidato al cargar la long list. */
  comentario: string | null;
  /** Nombre y link del CV en SharePoint (para volver a revisarlo desde el historial). */
  cvNombre: string | null;
  cvUrl: string | null;
}

/** Colores del badge de la etapa en la que se rechazó al candidato. */
export function etapaRechazoColors(codigo: string): { bg: string; text: string } {
  switch (codigo) {
    case 'LONG_LIST':      return { bg: '#F3E8FF', text: '#7E22CE' };
    case 'FORMULARIO':     return { bg: '#E0F2FE', text: '#0369A1' };
    case 'ENTREVISTAS':    return { bg: '#FCE7F3', text: '#BE185D' };
    case 'DECISION_FINAL': return { bg: '#FFEDD5', text: '#C2410C' };
    default:               return { bg: '#F3F4F6', text: '#374151' };
  }
}
