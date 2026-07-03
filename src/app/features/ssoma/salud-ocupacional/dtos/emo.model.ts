import { ConvalidacionListDto } from './convalidacion.model';

export type AptitudEmo =
  | 'Apto'
  | 'Apto con Restricciones'
  | 'No Apto'
  | 'Observado'
  | 'Pendiente'
  | string;

export type EstadoEmo = 'Vigente' | 'Por Vencer' | 'Vencido' | 'Anulado' | string;

export interface EmoListItemDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  tipoEmo: string;
  empresa: string;
  fechaEmo: string;
  fechaVencimiento: string;
  aptitud: AptitudEmo;
  estado: EstadoEmo;
  diasParaVencer: number;
}

export interface EmoDetalleDto extends EmoListItemDto {
  clinica?: string;
  medico?: string;
  numeroInforme?: string;
  urlResultado?: string;
  urlAptitud?: string;
  urlEmoCompleto?: string;
  requiereInterconsulta: boolean;
  notas?: string;
  examenes?: EmoExamenDetalleDto[];
  restricciones?: EmoRestriccionDto[];
  convalidaciones?: ConvalidacionListDto[];
  programacion?: EmoProgramacionDetalleDto;
  interconsulta?: EmoInterconsultaResumenDto;
}

export interface EmoProgramacionDetalleDto {
  id: number;
  fechaProgramada: string;
  horaProgramada?: string;
  checkInHora?: string;
  clinicaNombre?: string;
  medicoNombre?: string;
  estado: string;
  origen?: string;
  motivoRechazo?: string;
}

export interface EmoInterconsultaResumenDto {
  id: number;
  especialidad: string;
  medicoDeriva?: string;
  fechaDerivacion: string;
  fechaAtencion?: string;
  centroAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  resultado?: string;
  estado: string;
  requiereSeguimiento: boolean;
  urlInforme?: string;
}

export interface EmoExamenDetalleDto {
  id: number;
  examenTipo: string;
  resultado?: string;
  valor?: string;
  unidad?: string;
  observacion?: string;
}

export interface EmoRestriccionDto {
  id: number;
  restriccionTipo?: string;
  descripcionLibre?: string;
  vigente: boolean;
}

export interface EmoCreateDto {
  workerId: number;
  tipoEmoId: number;
  empresaOrigenId?: number;
  fechaEmo: string;
  clinicaId?: number;
  medicoId?: number;
  aptitud: AptitudEmo;
  requiereInterconsulta: boolean;
  numeroInforme?: string;
  urlResultado?: string;
  notas?: string;
  examenes: EmoExamenCreateDto[];
  restricciones: EmoRestriccionCreateDto[];
  fechaLectura?: string;
  interconsultaInline?: InterconsultaInlineCreateDto;
}

export interface EmoExamenCreateDto {
  examenTipoId: number;
  resultado?: string;
  valor?: string;
  unidad?: string;
  observacion?: string;
}

export interface EmoRestriccionCreateDto {
  restriccionTipoId?: number;
  descripcionLibre?: string;
  vigente?: boolean;
}

export interface WorkerEmoHistorialDto {
  workerId: number;
  workerNombre: string;
  workerDni: string;
  ocupacion?: string;
  empresa?: string;
  vinculaciones?: VinculacionConEmosDto[];
}

export interface VinculacionConEmosDto {
  empresaNombre: string;
  fechaInicio: string;
  fechaFin?: string;
  emos?: EmoListItemDto[];
}

export interface EmoQueryParams {
  workerId?: number;
  estado?: string;
  aptitud?: string;
  empresaId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type WorkerEstado = 'ACTIVO' | 'RETIRADO' | string;

export interface EmoPorTrabajadorDto {
  workerId: number;
  nombreCompleto: string;
  dni: string;
  estadoWorker?: WorkerEstado;
  empresaId?: number;
  empresa?: string;
  empresaOrigenNombre?: string;
  proyectoId?: number;
  proyecto?: string;
  proyectoNombre?: string;
  tipoContrata?: string;
  tieneEmo: boolean;
  emoId?: number;
  tipoEmo?: string;
  fechaEmo?: string;
  fechaVencimiento?: string;
  aptitud?: AptitudEmo;
  estado?: EstadoEmo;
  diasRestantes?: number;
  // Prellenado del modal de edición (Configuración → Trabajadores).
  documentIdentityTypeId?: number;
  cumpleanos?: string;
  urlAptitud?: string;
  urlEmoCompleto?: string;
  urlResultado?: string;
  requiereInterconsulta?: boolean;
  interconsultaId?: number;
  interconsultaEspecialidad?: string;
  interconsultaEstado?: string;
  interconsultaUrlInforme?: string;
  // Campos editables (modal Configuración → Trabajadores). Todos opcionales: el endpoint
  // PUT /workers/{id} aún no existe en backend; los valores se muestran si vienen.
  celular?: string;
  emailPersonal?: string;
  categoria?: string;
  ocupacion?: string;
  area?: string;
  subarea?: string;
  contrataCasa?: string;
  obraOficina?: string;
  jefatura?: string;
  sctr?: boolean;
  habilitadoObra?: boolean;
  notas?: string;
}

/** Catálogo de tipos de documento (DNI, CE, ...) para el select del modal. */
export interface DocumentTypeDto {
  id: number;
  abreviatura: string;
  descripcion: string;
}

/** Edición mínima de datos de identidad del trabajador (modal Configuración). */
export interface WorkerDatosBasicosDto {
  nombreCompleto: string;
  documentIdentityTypeId?: number | null;
  numeroDocumento?: string | null;
  /** Formato 'YYYY-MM-DD'. */
  cumpleanos?: string | null;
}

export interface WorkerUpsertDto {
  apellidoNombre: string;
  dni?: string;
  celular?: string | null;
  emailPersonal?: string | null;
  emailCorporativo?: string | null;
  fechaIngreso?: string | null;
  condicionMedica?: string | null;
  categoria?: string | null;
  ocupacion?: string | null;
  ocupacionId?: number | null;
  area?: string | null;
  subarea?: string | null;
  contrataCasa?: string | null;
  obraOficina?: string | null;
  jefatura?: string | null;
  sctr?: boolean;
  habilitadoObra?: boolean;
  notas?: string | null;
  tipoDocumento?: string;
  empresaId?: number | null;
  proyectoId?: number | null;
  fechaNacimiento?: string | null;
  sexo?: string | null;
  aniosExperiencia?: number | null;
}

export interface InterconsultaInlineCreateDto {
  especialidad: string;
  centroAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  medicoDerivaId?: number;
  requiereSeguimiento: boolean;
}

export interface EmoPorTrabajadorQuery {
  search?: string;
  aptitud?: string;
  estado?: string;
  empresaId?: number;
  proyectoId?: number;
  fechaEmoDesde?: string;
  fechaEmoHasta?: string;
  sinLectura?: boolean;
  sinCertificado?: boolean;
  sinEmoCompleto?: boolean;
  /** 'fechaEmo' | 'fechaVencimiento' */
  sortBy?: string;
  sortDesc?: boolean;
  page?: number;
  pageSize?: number;
}
