export type ConvalidacionResultado = 'Aprobada' | 'Rechazada' | 'Pendiente' | string;

export interface ConvalidacionListDto {
  id: number;
  emoOrigenId: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  empresaOrigen: string;
  empresaDestino: string;
  fechaConvalidacion: string;
  fechaVencimiento: string;
  resultado: ConvalidacionResultado;
  medico?: string;
  tipoEmo?: string;
  fechaEmoOrigen?: string;
  notas?: string;
  diasParaVencer: number | null;

  // Datos del EMO origen, para revisión del médico antes de resolver.
  emoFechaVencimiento?: string | null;
  urlResultado?: string | null;
  urlAptitud?: string | null;
  urlEmoCompleto?: string | null;
  interconsultaEstado?: string | null;
  interconsultaEspecialidad?: string | null;
  interconsultaUrlInforme?: string | null;
}

export interface ConvalidacionCreateDto {
  emoOrigenId: number;
  empresaDestinoId: number;
  fechaConvalidacion: string;
  fechaVencimiento: string;
  medicoId?: number;
  resultado: ConvalidacionResultado;
  notas?: string;
}
