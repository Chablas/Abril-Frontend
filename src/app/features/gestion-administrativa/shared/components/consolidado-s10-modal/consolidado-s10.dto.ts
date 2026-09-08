/**
 * Ámbito al que quedó asociado el PDF. Hoy siempre es "Rendicion": el consolidado cubre la
 * planilla entera. "Solicitud" solo aparece en registros antiguos, de cuando se podía adjuntar a
 * una salida suelta — se sigue leyendo para no esconder el respaldo de esas rendiciones.
 */
export type ConsolidadoS10Ambito = 'Rendicion' | 'Solicitud';

/** Consolidado del S10 vigente de una planilla de rendición. */
export interface ConsolidadoS10Dto {
  id: number;
  ambito: ConsolidadoS10Ambito;
  pdfUrl: string;
  pdfFilename: string;
  /**
   * Importe total con el que el S10 registró la planilla. Cuadra con el monto de la planilla
   * completa: el backend no acepta otro. Null en los consolidados subidos antes de que el
   * formulario pidiera el dato.
   */
  montoTotal: number | null;
  /** Número de guía del S10. Es texto (puede traer letras). Null en los consolidados viejos. */
  numeroGuia: string | null;
  /**
   * Copia firmada por el revisor (todas sus hojas). La genera la aprobación del reembolso
   * —aprobar ES firmar—, así que es null mientras no se haya aprobado.
   */
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  uploadedAt: string;
}
