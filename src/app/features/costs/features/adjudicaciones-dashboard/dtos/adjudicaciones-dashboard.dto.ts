export interface AdjChartItemDTO {
  id: number;
  label: string;
  value: number;
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

export interface AdjudicacionesDashboardDTO {
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
