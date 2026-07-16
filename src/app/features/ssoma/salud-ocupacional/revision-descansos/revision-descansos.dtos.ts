import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';

export interface RevisionDescansoListItemDto {
  id: number;
  workerId: number;
  workerNombre: string | null;
  workerDni: string | null;
  areaNombre: string | null;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  motivo: string | null;
  estado: string;
  adjuntosCount: number;
  createdAt: string;
}

export interface RevisionDescansoAdjuntoDto {
  url: string;
  nombre: string | null;
}

export interface RevisionDescansoDetalleDto {
  id: number;
  workerId: number;
  workerNombre: string | null;
  workerDni: string | null;
  areaNombre: string | null;
  empresaNombre: string | null;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  motivo: string | null;
  diagnostico: string | null;
  estado: string;
  motivoRechazo: string | null;
  aprobadoPorNombre: string | null;
  fechaAprobacion: string | null;
  observaciones: string | null;
  createdAt: string;
  adjuntos: RevisionDescansoAdjuntoDto[];
}

/** Nodo plano del árbol de áreas (area_scope) para el filtro en cascada. */
export interface RevisionAreaNodoDto {
  areaScopeId: number;
  areaItemName: string;
  areaScopeParentId: number | null;
  displayOrder: number;
}

export interface RevisionTrabajadorOpcionDto {
  workerId: number;
  nombreCompleto: string;
}

/** Carga inicial en un solo roundtrip: datos de filtros + primera página. */
export interface RevisionDescansosInitDto {
  areaTree: RevisionAreaNodoDto[];
  trabajadores: RevisionTrabajadorOpcionDto[];
  tabla: PagedResponseDTO<RevisionDescansoListItemDto>;
}

export interface RevisionDescansosFiltro {
  workerId: number | null;
  estado: string | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
}
