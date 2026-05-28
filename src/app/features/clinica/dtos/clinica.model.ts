export interface ProgramacionClinicaDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  ocupacion?: string | null;
  tipoEmo: string;
  tipoEmoId?: number;
  empresa: string;
  empresaId?: number;
  fechaProgramada: string;
  horaProgramada: string | null;
  clinica: string | null;
  medico: string | null;
  estado: string;
  motivo: string | null;
  checkInHora: string | null;
  motivoRechazo: string | null;
  emoResultadoId: number | null;
  fechaVencimientoEmo?: string | null;
  categoria?: string | null;
  tipoTrabajador?: string | null;
}

export interface ClinicaAccionDto {
  id: number;
  accion: 'Aceptar' | 'Rechazar' | 'CheckIn' | 'Completar';
  motivoRechazo?: string;
  checkInHora?: string;
  emoResultadoId?: number;
  fechaNueva?: string;
  horaNueva?: string;
}

export type EstadoProgramacionClinica =
  | 'Programado'
  | 'Aceptado por Clínica'
  | 'Rechazado por Clínica'
  | 'En Atención'
  | 'Completado'
  | 'No se presentó'
  | 'Cancelado';
