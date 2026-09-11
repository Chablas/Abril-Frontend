/**
 * Ámbito al que quedó asociado el PDF. Hoy siempre es "Rendicion": el consolidado cubre planillas
 * enteras (una o varias). "Solicitud" solo aparece en registros antiguos, de cuando se podía adjuntar
 * a una salida suelta — se sigue leyendo para no esconder el respaldo de esas rendiciones.
 */
export type ConsolidadoS10Ambito = 'Rendicion' | 'Solicitud';

/** Una planilla cubierta por un Consolidado del S10. */
export interface ConsolidadoS10RendicionDto {
  id: number;
  /** Código REN-AAAA-NNNN. */
  codigo: string;
}

/**
 * Consolidado del S10 vigente de una planilla de rendición. Un consolidado puede cubrir varias
 * planillas (de uno o de varios trabajadores de una misma razón social): las que lo comparten
 * reciben el mismo.
 */
export interface ConsolidadoS10Dto {
  id: number;
  ambito: ConsolidadoS10Ambito;
  pdfUrl: string;
  pdfFilename: string;
  /**
   * Importe total con el que el S10 registró las planillas. Cuadra con la suma de las planillas
   * completas que cubre: el backend no acepta otro. Null en los consolidados subidos antes de que
   * el formulario pidiera el dato.
   */
  montoTotal: number | null;
  /** Número de guía del S10. Es texto (puede traer letras). Null en los consolidados viejos. */
  numeroGuia: string | null;
  /**
   * Copia firmada por la jefatura (todas sus hojas). La genera la aprobación del reembolso
   * —aprobar ES firmar—, así que es null mientras no se haya aprobado.
   */
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  uploadedAt: string;
  /** Planillas que cubre, ordenadas por código. Vacía en los consolidados antiguos por salida. */
  rendiciones: ConsolidadoS10RendicionDto[];
}

/**
 * Códigos de las OTRAS planillas que cubre el consolidado de `rendicionId`: con cuáles comparte el
 * documento. Vacío si el consolidado es solo suyo o si todavía no tiene.
 */
export function otrasRendicionesDelConsolidado(
  consolidado: ConsolidadoS10Dto | null | undefined,
  rendicionId: number,
): string[] {
  return (consolidado?.rendiciones ?? []).filter((r) => r.id !== rendicionId).map((r) => r.codigo);
}
