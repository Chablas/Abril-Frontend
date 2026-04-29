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
  diasParaVencer: number;
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
