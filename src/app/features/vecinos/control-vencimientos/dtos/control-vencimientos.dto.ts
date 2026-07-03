/** Una licencia/permiso registrada. */
export interface VecinoLicenciaDTO {
  vecinoLicenciaId: number;
  archivoUrl: string;
  originalFileName: string | null;
  fechaVencimiento: string; // YYYY-MM-DD
  fechaRecordatorio: string; // YYYY-MM-DD
  diasAntes: number;
  /** Correos destinatarios del recordatorio (pueden ser grupos; se desglosan al enviar). */
  emails: string[];
  /** Momento en que se envió el recordatorio (null = pendiente). */
  recordatorioEnviadoDateTime: string | null;
}

/** Payload del formulario de creación (el archivo se envía aparte como multipart). */
export interface VecinoLicenciaCreateDTO {
  fechaVencimiento: string; // YYYY-MM-DD
  fechaRecordatorio: string; // YYYY-MM-DD
  diasAntes: number;
  /** Correos a los que se enviará el recordatorio. */
  emails: string[];
}
