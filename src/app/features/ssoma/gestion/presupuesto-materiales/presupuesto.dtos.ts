// ─── Cargas S10 ──────────────────────────────────────────────────────────────

export interface ImportConsumoResultDto {
  cargaId: number;
  nombreArchivo: string;
  totalLineas: number;
  lineasEstandarizadas: number;
  lineasPendientes: number;
  lineasSinMatch: number;
  estado: string;
  advertencias: string[];
}

export interface ConsumoCargaResumenDto {
  id: number;
  projectId: number;
  nombreArchivo: string;
  fechaMin: string;
  fechaMax: string;
  totalLineas: number;
  lineasEstandarizadas: number;
  lineasPendientes: number;
  estado: string;
  creadoEn: string;
  porcentajeEstandarizado: number;
}

// ─── Revisión de materiales ───────────────────────────────────────────────────

export interface MaterialPendienteDto {
  lineaId: number;
  recursoCrudo: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  fechaGuia: string;
  nombreItemSugerido?: string;
  nombreFamiliaSugerida?: string;
  scoreMatch?: number;
  metodoMatch?: string;
  estadoRevision?: string;
  itemIdSugerido?: number;
}

export interface RevisionDecisionDto {
  lineaId: number;
  decision: 'AUTORIZADO' | 'RECHAZADO';
  itemIdConfirmado?: number;
  motivoRechazo?: string;
}

export interface RevisionResultDto {
  autorizados: number;
  rechazados: number;
  notificacionesEnviadas: number;
  errores: string[];
}

export interface BuscarItemDto {
  id: number;
  nombre: string;
  nombreFamilia: string;
  tipoMaterial: string;
  perteneceSsoma: boolean;
}

// ─── Drivers / Ratios ─────────────────────────────────────────────────────────

export interface DriverProyectoDto {
  projectId: number;
  projectDescription: string;
  estado: string;
  hhTotalCasa: number | null;
  areaTechadaM2: number | null;
  trabajadores: number | null;
  hhFuente: string;
  familiasConRatio: number;
  tieneConsumos: boolean;
  habilitadoSsoma: boolean;
}

export interface ActualizarDriversDto {
  hhTotalCasa: number;
  areaTechadaM2: number;
  trabajadores: number;
  hhFuente: string;
  recalcularRatios: boolean;
}

export interface ActualizarDriversResultDto {
  projectId: number;
  ratiosCalculados: number;
  outliersMarcados: number;
}

export interface FamiliaConRatioDto {
  familiaId: number;
  nombreFamilia: string;
  tipoMaterial: string;
  variableBase: string;
  nProyectos: number;
  nOutliers: number;
}

export interface RatioProyectoItemDto {
  projectId: number;
  projectDescription: string;
  ratioCantidad: number;
  precioUnitario: number;
  cantidadTotal: number;
  valorDriver: number;
  esOutlier: boolean;
  incluidoManualRatio: boolean;
  incluidoManualPrecio: boolean;
}

export interface RatioFamiliaComparacionDto {
  familiaId: number;
  nombreFamilia: string;
  tipoMaterial: string;
  variableBase: string;
  proyectos: RatioProyectoItemDto[];
  promedioRatio: number;
  medianaRatio: number;
  minRatio: number;
  maxRatio: number;
  promedioPrecioUnitario: number;
}

// ─── Presupuesto ──────────────────────────────────────────────────────────────

export interface GenerarPresupuestoDto {
  hhTotalCasa?: number;
  areaTechadaM2?: number;
  trabajadores?: number;
  notas?: string;
}

export interface ActualizarLineaPresupuestoDto {
  cantidadManual?: number | null;
  precioManual?: number | null;
  notasLinea?: string | null;
}

export interface PresupuestoResumenDto {
  id: number;
  projectId: number;
  projectDescription: string;
  version: number;
  estado: string;
  hhUsado: number;
  areaUsada: number;
  trabajadoresUsados: number;
  totalEstimado: number;
  totalFamilias: number;
  familiasSinHistoria: number;
  generadoEn: string;
}

export interface PresupuestoLineaDto {
  lineaId: number;
  familiaId: number;
  nombreFamilia: string;
  tipoId: number;
  nombreTipo: string;
  variableBase: string;
  ratioRecomendado: number;
  nProyectosBase: number;
  valorDriver: number;
  cantidadEstimada: number;
  precioUnitario: number;
  totalEstimado: number;
  tieneHistoria: boolean;
  cantidadManual: number | null;
  precioManual: number | null;
  notasLinea: string | null;
  cantidadEfectiva: number;
  precioEfectivo: number;
  totalEfectivo: number;
}

export interface PresupuestoTipoDto {
  tipoId: number;
  nombreTipo: string;
  totalEstimado: number;
  familias: PresupuestoLineaDto[];
}

export interface PresupuestoDetalleDto extends PresupuestoResumenDto {
  notas: string | null;
  tipos: PresupuestoTipoDto[];
}

// ─── Control semanal ──────────────────────────────────────────────────────────

export interface AbrirSemanaDto {
  presupuestoId: number;
  fechaInicio: string;
  fechaFin: string;
  observaciones?: string;
}

export interface RegistrarConsumoLineaDto {
  familiaId: number;
  cantidadReal: number;
  precioUnitario?: number | null;
  notas?: string | null;
}

export interface ControlSemanaLineaDto {
  id: number;
  familiaId: number;
  nombreFamilia: string;
  nombreTipo: string;
  cantidadReal: number;
  precioUnitario: number | null;
  totalReal: number;
  notas: string | null;
}

export interface ControlSemanaDto {
  id: number;
  presupuestoId: number;
  projectId: number;
  projectDescription: string;
  semanaNum: number;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  observaciones: string | null;
  registradoEn: string;
  lineas: ControlSemanaLineaDto[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type Semaforo = 'OK' | 'ADVERTENCIA' | 'ALERTA' | 'SIN_PRESUPUESTO';

export interface DashboardLineaDto {
  familiaId: number;
  nombreFamilia: string;
  tipoId: number;
  variableBase: string;
  cantidadPresupuestada: number;
  cantidadConsumida: number;
  cantidadSaldo: number;
  precioUnitario: number;
  totalPresupuestado: number;
  totalConsumido: number;
  totalSaldo: number;
  pctConsumido: number;
  semaforo: Semaforo;
}

export interface DashboardTipoDto {
  tipoId: number;
  nombreTipo: string;
  totalPresupuestado: number;
  totalConsumido: number;
  totalSaldo: number;
  pctConsumido: number;
  familias: DashboardLineaDto[];
}

export interface DashboardPresupuestoDto {
  presupuestoId: number;
  projectId: number;
  projectDescription: string;
  version: number;
  totalPresupuestado: number;
  totalConsumido: number;
  totalSaldo: number;
  pctConsumido: number;
  semanasRegistradas: number;
  familiasEnAlerta: number;
  familiasEnAdvertencia: number;
  tipos: DashboardTipoDto[];
}

// ─── Dotación de personal SSOMA por hito crítico ──────────────────────────────

export interface HitoCriticoDisponibleDto {
  hitoId: number;
  hitoDescripcion: string;
  hitoFecha: string | null;
}

export interface PersonalHitoDto {
  id: number;
  hitoId: number;
  hitoDescripcion: string;
  hitoFecha: string | null;
  esHitoCritico: boolean;
  rol: 'PREVENCIONISTA' | 'MONITOR' | 'VIGIA';
  cantidad: number;
  semanas: number;
  costoMensual: number;
  total: number;
}

export interface PersonalHitoItemInputDto {
  hitoId: number;
  rol: 'PREVENCIONISTA' | 'MONITOR' | 'VIGIA';
  cantidad: number;
  semanas: number;
  costoMensual: number;
}

export interface PersonalHitoGuardarDto {
  items: PersonalHitoItemInputDto[];
}
