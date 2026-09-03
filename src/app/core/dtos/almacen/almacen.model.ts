export const TIPOS_MOVIMIENTO_ALMACEN = ['Ingreso', 'Salida'] as const;
export type TipoMovimientoAlmacen = (typeof TIPOS_MOVIMIENTO_ALMACEN)[number];

export const TIPOS_DOCUMENTO_OC = ['Orden de Compra', 'Contrato'] as const;
export type TipoDocumentoOC = (typeof TIPOS_DOCUMENTO_OC)[number];

export interface ProyectoAlmacenFiltroDTO {
  id: number;
  nombre: string;
}

export interface AlmacenMaterialDTO {
  id: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  activo: boolean;
}

export interface CreateAlmacenMaterialBody {
  codigo: string;
  nombre: string;
  unidadMedida: string;
  puntoReorden?: number | null;
  stockSeguridad?: number | null;
}

export interface AlmacenFiltrosDTO {
  proyectos: ProyectoAlmacenFiltroDTO[];
  materiales: AlmacenMaterialDTO[];
}

export interface CreateAlmacenMovimientoBody {
  proyectoId: number;
  materialId: number;
  fecha: string;
  tipo: string;
  cantidad: number;
  origen?: string | null;
  comentario?: string | null;
}

export interface AlmacenMovimientoListItemDTO {
  id: number;
  proyectoId: number;
  proyectoNombre: string | null;
  materialId: number;
  materialCodigo: string | null;
  materialNombre: string | null;
  unidadMedida: string | null;
  fecha: string;
  tipo: string;
  cantidad: number;
  origen: string | null;
  comentario: string | null;
  creadoPor: string | null;
}

export interface AlmacenMovimientosQueryParams {
  proyectoId?: number | null;
  materialId?: number | null;
  tipo?: string | null;
  desde?: string | null;
  hasta?: string | null;
  pagina: number;
  porPagina: number;
}

export interface AlmacenMovimientoListResponseDTO {
  total: number;
  pagina: number;
  porPagina: number;
  items: AlmacenMovimientoListItemDTO[];
}

export interface AlmacenStockItemDTO {
  materialId: number;
  materialCodigo: string;
  materialNombre: string;
  unidadMedida: string;
  totalIngresos: number;
  totalSalidas: number;
  saldoActual: number;
}

export interface AlmacenStockDTO {
  proyectoId: number | null;
  materiales: AlmacenStockItemDTO[];
}

export interface CreateAlmacenOrdenCompraBody {
  proyectoId: number;
  numero: string;
  tipo: string;
  proveedor: string;
  contratistaId?: number | null;
  monto: number;
  moneda: string;
  fecha: string;
}

export interface AlmacenOrdenCompraListItemDTO {
  id: number;
  proyectoId: number;
  proyectoNombre: string | null;
  numero: string;
  tipo: string;
  proveedor: string;
  contratistaId: number | null;
  monto: number;
  moneda: string;
  fecha: string;
  archivoUrl: string;
  archivoNombre: string;
  subidoPor: string | null;
  createdAt: string;
}

export interface AlmacenOrdenCompraQueryParams {
  proyectoId?: number | null;
  tipo?: string | null;
  search?: string | null;
  pagina: number;
  porPagina: number;
}

export interface AlmacenOrdenCompraListResponseDTO {
  total: number;
  pagina: number;
  porPagina: number;
  items: AlmacenOrdenCompraListItemDTO[];
}

export interface AlmacenDashboardFlujoItemDTO {
  materialNombre: string;
  totalIngresos: number;
  totalSalidas: number;
}

export interface AlmacenDashboardParticipacionItemDTO {
  proyectoNombre: string;
  totalConsumo: number;
  porcentaje: number;
}

export interface AlmacenMaterialCriticoDTO {
  materialId: number;
  materialNombre: string;
  unidadMedida: string;
  stockActual: number;
  puntoReorden: number;
  stockSeguridad: number;
  estado: string;
  accionRecomendada: string;
}

export interface AlmacenCoberturaItemDTO {
  materialNombre: string;
  diasCobertura: number | null;
}

export interface AlmacenDashboardDTO {
  flujoMateriales: AlmacenDashboardFlujoItemDTO[];
  participacionProyectos: AlmacenDashboardParticipacionItemDTO[];
  materialesCriticos: AlmacenMaterialCriticoDTO[];
  cobertura: AlmacenCoberturaItemDTO[];
  limiteSeguridadDias: number;
}
