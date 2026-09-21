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
 * planillas (de uno o de varios trabajadores, de las razones sociales que sean): las que lo
 * comparten reciben el mismo.
 */
export interface ConsolidadoS10Dto {
  id: number;
  /**
   * Código de la rendición grupal, `CONS-ÁREA-AAAA-NNN`: el nombre del conjunto de planillas que se
   * consolidaron juntas. Sobrevive al reemplazo del archivo —el grupo es el mismo—, así que es el
   * identificador con el que se sigue al consolidado por las cuatro pantallas de su ciclo. Null en
   * los consolidados anteriores a la columna.
   */
  codigo: string | null;
  ambito: ConsolidadoS10Ambito;
  pdfUrl: string;
  pdfFilename: string;
  /**
   * Importe total con el que el S10 registró las planillas. Cuadra con la suma de las planillas
   * completas que cubre: el backend no acepta otro. Null en los consolidados subidos antes de que
   * el formulario pidiera el dato.
   */
  montoTotal: number | null;
  /** Número del reembolso del S10. Es texto (puede traer letras). Null en los consolidados viejos. */
  numeroReembolso: string | null;
  /**
   * La PLANILLA GRUPAL: el PDF que junta en un solo documento las planillas de gasto de todo lo que
   * cubre el consolidado. La genera Abril One al adjuntarse el S10 —no se sube— y se rehace si el
   * consolidado se reemplaza. Null en los consolidados anteriores a la columna.
   */
  planillaGrupalUrl: string | null;
  planillaGrupalFilename: string | null;
  /**
   * Copia de la planilla grupal con la firma de la jefatura: se firma junto con el consolidado al
   * aprobar el reembolso. Null mientras no se apruebe, y en los aprobados antes de que se firmara.
   */
  planillaGrupalFirmadoUrl: string | null;
  planillaGrupalFirmadoFilename: string | null;

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
 * Lo que deja adjuntar el Consolidado del S10: el documento que quedó y cómo salió el aviso a la
 * jefatura, que va pegado al mismo paso —consolidar es lo que deja el reembolso esperando su firma—.
 *
 * El aviso es best-effort: si no salió, el consolidado igual quedó adjunto y `avisoJefatura` dice
 * por qué. Desde Consolidados se puede volver a mandar a mano.
 */
export interface ConsolidadoS10UploadResultDto {
  consolidado: ConsolidadoS10Dto;
  /** true = el correo salió y la jefatura ya lo tiene en su bandeja. */
  jefaturaAvisada: boolean;
  /** Qué pasó con el aviso, ya redactado por el backend para imprimirlo tal cual. */
  avisoJefatura: string;
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
