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
  uploadedAt: string;
}
