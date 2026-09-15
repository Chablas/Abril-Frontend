/** Respuestas que acepta el enlace del correo (el parámetro `r` de la URL). */
export type RespuestaEntrevista = 'confirmar' | 'rechazar';

/**
 * Lo que devuelve el backend después de registrar la respuesta del candidato: su respuesta y la
 * cita sobre la que respondió, para que la pantalla se lo confirme con los datos a la vista y no
 * con un "listo" a secas.
 */
export interface EntrevistaRespuestaPublica {
  /** CONFIRMADA o RECHAZADA (código estable del catálogo). */
  respuestaCodigo: string;
  candidatoNombre: string;
  puesto: string;
  /** Fecha de la cita en formato `YYYY-MM-DD`. */
  fecha: string;
  /** Hora de la cita en formato `HH:mm` 24h. */
  hora: string;
  lugarNombre: string;
  /**
   * Referencia para ubicar el lugar (`gth_lugar_entrevista.referencia`), la misma línea que
   * muestra el correo de invitación bajo la dirección. Null si el lugar no la tiene cargada.
   */
  lugarReferencia: string | null;
  /** Enlace al mapa del lugar (`gth_lugar_entrevista.maps_url`). Null si no lo tiene cargado. */
  lugarMapsUrl: string | null;
}
