/** Una licencia/permiso registrada. */
export interface VecinoLicenciaDTO {
  vecinoLicenciaId: number;
  archivoUrl: string;
  originalFileName: string | null;
  fechaVencimiento: string; // YYYY-MM-DD
  fechaRecordatorio: string; // YYYY-MM-DD
  diasAntes: number;
}

/** Payload del formulario de creación (el archivo se envía aparte como multipart). */
export interface VecinoLicenciaCreateDTO {
  fechaVencimiento: string; // YYYY-MM-DD
  fechaRecordatorio: string; // YYYY-MM-DD
  diasAntes: number;
}
