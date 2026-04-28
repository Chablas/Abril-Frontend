export interface SctrWorkerDto {
  workerId: number;
  apellidoNombre: string;
  dni: string;
  aprobado: boolean;
}

export interface SctrVidaLeyDto {
  id: number;
  empresaId: number;
  empresaNombre: string;
  proyectoId: number;
  proyectoNombre: string;
  tipo: string;
  mes: number;
  anio: number;
  archivoUrl?: string;
  archivoUrl2?: string;
  estado: string;
  vigencia?: string;
  obsAbril?: string;
  workers: SctrWorkerDto[];
}

export interface SctrVidaLeyCreateDto {
  proyectoId: number;
  tipo: string;
  mes: number;
  anio: number;
  archivoUrl?: string;
  archivoUrl2?: string;
  workerIds: number[];
}
