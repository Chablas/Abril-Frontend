export interface WorkerSearchItemDto {
  id: number;
  apellidoNombre: string;
  dni: string;
  cargo?: string;
  categoria?: string;
  ocupacion?: string;
  empresaActual?: string;
  empresaActualId?: number;
  activo: boolean;
  aniosExperiencia?: number;
  fechaIngreso?: string;
  inhabilitadoSsoma?: boolean;
  esAbril?: boolean;
}
