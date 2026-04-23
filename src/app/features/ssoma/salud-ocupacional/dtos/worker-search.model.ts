export interface WorkerSearchItemDto {
  id: number;
  apellidoNombre: string;
  dni: string;
  ocupacion?: string;
  empresaActual?: string;
  empresaActualId?: number;
  activo: boolean;
}
