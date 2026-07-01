export interface WorkerHabilitacionListDto {
  workerId: number;
  apellidoNombre: string;
  dni: string;
  empresaNombre?: string;
  empresaId?: number;
  proyectoActual?: string;
  proyectoActualId?: number;
  estadoHabilitacion: string;
  categoria?: string;
  ocupacion?: string;
  estadoWorker: string;
  contrataCasa?: string;
  obraOficina?: string;
  tieneEmo?: boolean;
  diasRestantesEmo?: number | null;
  estadoProgramacionEmo?: string | null;
  fechaIngreso?: string;
  aniosExperiencia?: number;
}

export interface WorkerEntregableDto {
  id: number;
  itemId: number;
  nombreItem: string;
  estado: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
  requiereVigencia: boolean;
  esSctrVidaley: boolean;
  responsable: string;
}

export interface WorkerEntregableUpdateDto {
  estado?: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
}

export interface DocumentoArchivoDto {
  id: number;
  archivoUrl: string;
  nombreArchivo?: string;
  esZip: boolean;
  zipContenido?: { nombre: string; tamaño: number }[];
  orden: number;
}

export interface DocumentoVersionDto {
  id: number;
  version: number;
  archivoUrl: string;
  subidoPorUserId?: number;
  subidoPorEmpresaId?: number;
  subidoPorNombre?: string;
  estadoAlSubir?: string;
  createdAt: string;
  archivos?: DocumentoArchivoDto[];
}

export interface ArchivoStagingDto {
  file: File;
  nombre: string;
  path?: string;
  esZip: boolean;
  zipContenido?: string;
  subiendo: boolean;
  error: boolean;
}

export interface WorkerDetalleDto {
  workerId: number;
  apellidoNombre: string;
  dni?: string;
  celular?: string;
  emailCorporativo?: string;
  fechaIngreso?: string;
  condicionMedica?: string;
  fechaNacimiento?: string;
  sexo?: string;
  fechaRetiro?: string;
  sctr?: boolean;
  area?: string;
  subarea?: string;
  jefatura?: string;
  obraOficina?: string;
  aniosExperiencia?: number;
}

export interface WorkerEditDto {
  apellidoNombre: string;
  celular?: string;
  fechaNacimiento?: string;
  fechaRetiro?: string;
  sctr?: boolean;
  area?: string;
  subarea?: string;
  jefatura?: string;
}

export interface WorkerReingresoDto {
  nuevoProyectoId?: number;
  nuevaEmpresaId?: number;
  fechaReingreso?: string;
}

export interface WorkerEventoDto {
  id: number;
  tipoEvento: string;
  descripcion?: string;
  proyectoAnterior?: string;
  proyectoNuevo?: string;
  empresaAnterior?: string;
  empresaNueva?: string;
  datos?: string;
  createdAt: string;
}

export interface WorkerProyectoDto {
  id: number;
  workerId: number;
  proyectoId: number;
  proyectoNombre?: string;
  empresaId?: number;
  empresaNombre?: string;
  fechaInicio: string;
  fechaFin?: string;
  induccionCompletada: boolean;
  fechaInduccion?: string;
  activo: boolean;
}

export interface AgregarProyectoDto {
  proyectoId: number;
  empresaId?: number;
  fechaInicio?: string;
}
