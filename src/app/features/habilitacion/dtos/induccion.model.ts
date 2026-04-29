export interface InduccionDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  proyectoId: number;
  proyectoNombre: string;
  empresaId: number;
  empresaNombre: string;
  fechaProgramada: string;
  trabajoAltura: boolean;
  estado: string;
  programadoPor?: number;
}

export interface InduccionCreateDto {
  workerId: number;
  proyectoId: number;
  empresaId: number;
  fechaProgramada: string;
  trabajoAltura: boolean;
}
