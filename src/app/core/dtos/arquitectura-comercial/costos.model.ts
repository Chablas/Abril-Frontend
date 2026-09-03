export const PARTIDAS_COSTO = ['Mano de Obra', 'Materiales', 'Subcontrata'] as const;
export type PartidaCosto = (typeof PARTIDAS_COSTO)[number];

export interface ProyectoCostoFiltroDTO {
  id: number;
  nombre: string;
}

export interface CostoFiltrosDTO {
  proyectos: ProyectoCostoFiltroDTO[];
  partidas: string[];
}

export interface UpsertCostoRegistroBody {
  proyectoId: number;
  anio: number;
  mes: number;
  semana: number;
  partida: string;
  monto: number;
}

export interface UpsertCostoProyeccionBody {
  proyectoId: number;
  anio: number;
  mes: number;
  partida: string;
  monto: number;
}

export interface UpsertCostoMetaBody {
  anio: number;
  mes: number;
  monto: number;
}

export interface CostoPartidaFilaDTO {
  partida: string;
  montosPorSemana: Record<number, number>;
  totalMes: number;
}

export interface CostoPartidaProyeccionDTO {
  partida: string;
  monto: number;
}

export interface CostoMatrizDTO {
  proyectoId: number;
  proyectoNombre: string;
  anio: number;
  mes: number;
  numeroSemanas: number;
  partidas: CostoPartidaFilaDTO[];
  subtotalMes: number;
  anioProyeccion: number;
  mesProyeccion: number;
  proyecciones: CostoPartidaProyeccionDTO[];
  subtotalProyeccion: number;
}

export interface CostoDashboardItemDTO {
  proyectoId: number;
  proyectoNombre: string;
  totalMes: number;
}

export interface CostoDashboardDTO {
  anio: number;
  mes: number;
  proyectos: CostoDashboardItemDTO[];
}

export interface CostoEvolucionPuntoDTO {
  anio: number;
  mes: number;
  gastoEjecutadoOProyectado: number;
  esProyeccion: boolean;
  presupuestoMeta: number | null;
}

export interface CostoEvolucionDTO {
  puntos: CostoEvolucionPuntoDTO[];
}
