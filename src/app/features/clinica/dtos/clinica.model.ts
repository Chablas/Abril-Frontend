/**
 * De dónde sale un destinatario del correo de la cita: es el código del destinatario en
 * la Configuración de EMOs (CLINICA, JEFE, TRABAJADOR, RESIDENTE, COORD_ADMIN,
 * COORD_SSOMA, ADMIN_RAZON_SOCIAL, GTH, MEDICINA_OCUPACIONAL, ARQCOM_*, POSTVENTA_*)
 * o 'ADICIONAL' si es un correo agregado a mano.
 */
export type ProgramacionDestinatarioOrigen = string;

export interface ProgramacionDestinatarioDto {
  email: string;
  /** Nombre de la clínica, del jefe o etiqueta del destinatario. Puede venir vacío. */
  nombre?: string | null;
  origen: ProgramacionDestinatarioOrigen;
}

/**
 * Vista previa de a quién le llegará el correo al programar el EMO. La resuelve el backend
 * con el mismo resolver del envío real, aplicando la matriz de la Configuración de EMOs
 * (sección "Programación manual") al perfil del trabajador.
 */
export interface ProgramacionDestinatariosDto {
  para: ProgramacionDestinatarioDto[];
  copias: ProgramacionDestinatarioDto[];
}

export interface CreateProgramacionDto {
  workerId: number;
  tipoEmoId: number;
  empresaId: number | null;
  fechaProgramada: string;
  horaProgramada: string | null;
  clinicaId: number | null;
  medicoId: number | null;
  notas: string | null;
  origen: string;
}

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
  interconsultaEstado?: string;
  proyecto?: string | null;
}

export interface ClinicaInterconsultaCreateDto {
  workerId: number;
  especialidad: string;
  programacionId: number;
  centroAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  medicoDerivaId?: number;
  requiereSeguimiento: boolean;
}

export interface ClinicaAccionDto {
  id: number;
  accion: 'Aceptar' | 'Rechazar' | 'CheckIn' | 'Completar' | 'No Asistió';
  motivoRechazo?: string;
  checkInHora?: string;
  emoResultadoId?: number;
  nuevaFecha?: string;
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
