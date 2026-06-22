export interface DescansoMedicoListItemDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  empresaNombre?: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  estado: string;
  reportadoPorTrabajador: boolean;
  createdAt: string;
}

export interface DescansoFilterDto {
  workerId?: number;
  estado?: string;
  tipo?: string;
  empresaId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
}
