/**
 * Resultado de «Rendir»: la planilla que se generó y si quedó en primera revisión. El PDF no viaja:
 * queda guardado y se abre desde Mis Rendiciones.
 */
export interface RendirResultDto {
  rendicionId: number;
  /** Código REN-AAAA-NNNN de la planilla generada. */
  codigo: string;
  /** Cuántas salidas se rindieron. */
  rendidas: number;
  /**
   * true = la planilla quedó en primera revisión. false = se rindió pero no se pudo enviar (queda
   * "Lista para enviar" en Mis Rendiciones) y `message` dice por qué.
   */
  enviadaARevision: boolean;
  message: string;
}
