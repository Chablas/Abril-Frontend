export type HojaRutaEstado = 'Cumple' | 'Pendiente' | 'NoAplica' | 'Informativo' | 'Manual';

export interface HojaRutaItemDto {
  codigo: string;
  nombre: string;
  estado: HojaRutaEstado;
  detalle?: string;
  totalRequerido?: number;
  totalCumplido?: number;
}

export interface ContratistaActivoDto {
  contributorId: number;
  nombre: string;
}

export interface HojaRutaResumenDto {
  contributorId: number;
  empresaNombre: string;
  proyectoId: number;
  anio: number;
  numeroSemana: number;
  fechaInicio: string;
  fechaFin: string;
  totalTrabajadoresActivos: number;
  items: HojaRutaItemDto[];
}
