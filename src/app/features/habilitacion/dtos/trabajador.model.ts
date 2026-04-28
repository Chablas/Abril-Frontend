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
  estado: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
}

export interface DocumentoVersionDto {
  id: number;
  version: number;
  archivoUrl: string;
  subidoPorUserId?: number;
  subidoPorEmpresaId?: number;
  estadoAlSubir?: string;
  createdAt: string;
}
