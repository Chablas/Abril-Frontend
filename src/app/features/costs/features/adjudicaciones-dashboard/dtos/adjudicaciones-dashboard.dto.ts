export interface AdjChartItemDTO {
  id: number;
  label: string;
  value: number;
  /** Detalle breve por ítem ("CONTRATISTA — PARTIDA"); solo llega en porEstado (tooltip de la barra). */
  items?: string[];
}

export interface AdjMoneyByCurrencyDTO {
  code: string;
  symbol: string;
  total: number;
}

export interface AdjDashboardSummaryDTO {
  total: number;
  completadas: number;
  enProceso: number;
  totalProyectos: number;
  montoPenTotal: number;
  montoUsdTotal: number;
  plazoPromedioDias: number;
}

export interface AdjOptionDTO {
  id: number;
  label: string;
}

export interface AdjDashboardFiltersDTO {
  projects: AdjOptionDTO[];
  contractTypes: AdjOptionDTO[];
  contractModalities: AdjOptionDTO[];
  paymentMethods: AdjOptionDTO[];
  statuses: AdjOptionDTO[];
}

/** Valores seleccionados en los filtros del dashboard (null = sin filtrar). */
export interface AdjDashboardFilterValues {
  projectId: number | null;
  contractTypeId: number | null;
  contractModalityId: number | null;
  paymentMethodId: number | null;
  projectSubContractorStatusId: number | null;
}

export interface AdjudicacionesDashboardDTO {
  /** Catálogos de filtros; solo llega en la primera carga. */
  filters?: AdjDashboardFiltersDTO;
  summary: AdjDashboardSummaryDTO;
  porEstado: AdjChartItemDTO[];
  porProyecto: AdjChartItemDTO[];
  porTipoContrato: AdjChartItemDTO[];
  porCategoria: AdjChartItemDTO[];
  porModalidad: AdjChartItemDTO[];
  porModalidadPago: AdjChartItemDTO[];
  llegadaObservaciones: AdjChartItemDTO[];
  porMes: AdjChartItemDTO[];
  montoPorMoneda: AdjMoneyByCurrencyDTO[];
  topSubcontratistasPen: AdjChartItemDTO[];
  topSubcontratistasUsd: AdjChartItemDTO[];
  topContratistas: AdjChartItemDTO[];
}
