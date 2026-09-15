export interface RacListQuery {
  proyectoId?: number;
  estado?: string;
  severidad?: string;
  tipo?: string;
  empresaReportadaId?: number;
  empresaReportanteId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}

export interface RacPagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RacCreateRequest {
  proyectoId: number;
  tipo: string;
  categoriaId: number;
  severidad: string;
  esAnonimoReportante: boolean;
  reportanteId?: number;
  reportanteNombre?: string;
  reportanteCargo?: string;
  empresaReportanteId?: number;
  esAnonimoObservado: boolean;
  observadoWorkerId?: number;
  observadoWorkerIds?: number[];
  empresaReportadaId?: number;
  proyectoPiso?: string;
  lugarDescripcion?: string;
  latitud?: number;
  longitud?: number;
  descripcion: string;
  accionRequerida?: string;
  planAccion?: string;
  fechaReporte: string;
  plazoLevantamiento?: string;
}

export interface RacCerrarRequest {
  cierreDescripcion: string;
  fotoCierreUrl?: string;
}

export interface RacFotoDto {
  id: number;
  url: string;
  tipo: string;
  nombreArchivo?: string;
  orden: number;
}

export interface RacListItemDto {
  id: number;
  codigo: string;
  proyectoNombre?: string;
  proyectoAbreviacion?: string;
  tipo: string;
  categoriaNombre: string;
  categoriaAmbito: string;
  severidad: string;
  estado: string;
  fechaReporte: string;
  plazoLevantamiento?: string;
  aplicaPenalidad: boolean;
  empresaReportadaNombre?: string;
  empresaReportanteNombre?: string;
  reportanteNombre?: string;
  descripcion?: string;
}

export interface RacDetalleDto {
  id: number;
  codigo: string;
  proyectoId?: number;
  proyectoNombre?: string;
  tipo: string;
  categoriaId: number;
  categoriaNombre: string;
  categoriaAmbito: string;
  severidad: string;
  esAnonimoReportante: boolean;
  reportanteId?: number;
  reportanteNombre?: string;
  reportanteCargo?: string;
  empresaReportanteId?: number;
  empresaReportanteNombre?: string;
  esAnonimoObservado: boolean;
  observadoWorkerId?: number;
  observadoNombre?: string;
  empresaReportadaId?: number;
  empresaReportadaNombre?: string;
  proyectoPiso?: string;
  lugarDescripcion?: string;
  latitud?: number;
  longitud?: number;
  descripcion: string;
  planAccion?: string;
  fechaReporte: string;
  plazoLevantamiento?: string;
  estado: string;
  fechaCierre?: string;
  cierreDescripcion?: string;
  cerradoPorNombre?: string;
  cerradoPorCargo?: string;
  /** @deprecated Legacy previo al rediseño de Penalidades — ya no se escribe en RACs nuevos. */
  aplicaPenalidad: boolean;
  pdfUrl?: string;
  createdAt: string;
  fotos: RacFotoDto[];
}

export interface RacDashboardDto {
  totalAbiertos: number;
  totalCerrados: number;
  criticosAbiertos: number;
  altosAbiertos: number;
  vencidosAbiertos: number;
  totalReportados: number;
  totalReportadosCerrados: number;
  porProyecto: RacPorProyectoDto[];
  porCategoria: RacPorCategoriaDto[];
  tendencia: RacTendenciaDto[];
}

export interface RacPorProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
  total: number;
  abiertos: number;
  cerrados: number;
}

export interface RacPorCategoriaDto {
  categoriaNombre: string;
  ambito: string;
  total: number;
}

export interface RacTendenciaDto {
  anio: number;
  mes: number;
  total: number;
  actos: number;
  condiciones: number;
}

export interface RacCategoriaDto {
  id: number;
  nombre: string;
  tipo: string;
  ambito?: string;
  orden: number;
}

export interface RacCreadoDto {
  id: number;
  codigo: string;
}

export interface RacFotoUploadResult {
  id: number;
  url: string;
  tipo: string;
  nombreArchivo: string;
}

// Los DTOs de Penalidades viven en su propio módulo — ver
// features/ssoma/gestion/penalidades/dtos/penalidad.dtos.ts — ya no en RAC.
