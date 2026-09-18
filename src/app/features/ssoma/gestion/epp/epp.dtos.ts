export interface EppCategoriaDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
  totalItems: number;
}

export interface EppCategoriaUpsertDto {
  nombre: string;
  orden: number;
}

export interface EppFamiliaDto {
  id: number;
  nombre: string;
  categoriaId: number;
  categoriaNombre: string;
  orden: number;
  activo: boolean;
  totalItems: number;
}

export interface EppFamiliaUpsertDto {
  nombre: string;
  categoriaId: number;
  orden: number;
}

export interface EppModeloDto {
  id: number;
  marca: string;
  modelo: string;
  codigoReferencia: string | null;
  imagenUrl: string | null;
  activo: boolean;
}

export interface EppModeloUpsertDto {
  marca: string;
  modelo: string;
  codigoReferencia?: string | null;
}

export interface EppItemListDto {
  id: number;
  nombreTecnico: string;
  nombreComercial: string;
  familiaId: number;
  familiaNombre: string;
  categoriaId: number;
  categoriaNombre: string;
  imagenUrl: string | null;
  fichaTecnicaUrl: string | null;
  fichaTecnicaNombreArchivo: string | null;
  activo: boolean;
  totalModelos: number;
  modelos: EppModeloDto[];
}

export interface EppAuditoriaDto {
  entidadTipo: string;
  accion: string;
  detalle: string | null;
  usuarioNombre: string | null;
  fecha: string;
}

export interface EppItemDetalleDto extends EppItemListDto {
  descripcion: string | null;
  auditoria: EppAuditoriaDto[];
}

export interface EppItemUpsertDto {
  nombreTecnico: string;
  nombreComercial: string;
  familiaId: number;
  descripcion?: string | null;
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

export interface EppPedidoLineaDto {
  nombreTecnico: string;
  nombreComercial: string;
  marca: string | null;
  modelo: string | null;
  talla: string | null;
  cantidad: number;
}

export interface EppPedidoListDto {
  id: number;
  codigo: string;
  projectId: number;
  projectDescription: string;
  generadoPorNombre: string | null;
  fecha: string;
  estado: string;
  totalLineas: number;
  totalUnidades: number;
}

export interface EppPedidoDetalleDto extends EppPedidoListDto {
  observaciones: string | null;
  lineas: EppPedidoLineaDto[];
}

export interface EppPedidoLineaCreateDto {
  eppItemId: number | null;
  eppModeloId: number | null;
  nombreTecnico: string;
  nombreComercial: string;
  marca: string | null;
  modelo: string | null;
  talla: string | null;
  cantidad: number;
}

export interface EppPedidoCreateDto {
  projectId: number;
  observaciones?: string | null;
  lineas: EppPedidoLineaCreateDto[];
}
