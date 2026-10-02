/**
 * Envío manual de un recordatorio, paso 1: lo que saldría si el cron corriera el día elegido. El
 * backend lo calcula con el mismo plan que el cron y no envía nada.
 */
export interface RecordatorioSimulacion {
  /** false = ese día no sale ningún correo; `motivo` dice por qué. */
  seEnvia: boolean;
  motivo: string | null;
  /** Cuántos correos salen (uno por residente, o uno por trabajador). */
  correos: number;
  /** Los destinatarios de todos esos correos, sin repetir a nadie. */
  para: string[];
  copia: string[];
  copiaOculta: string[];
}

/** Paso 2: lo que salió. */
export interface RecordatorioEnvioManual {
  enviados: number;
  fallidos: number;
  /** Solo cuando no salió nada: por qué. */
  motivo: string | null;
}
