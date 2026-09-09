// ─── Materiales (catálogo único: Tambor Retráctil, Freno de Cuerda, etc.) ─────

export interface ActivoRotativoMaterialDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
  totalActivos: number;
  presupuestoItemId?: number;
  presupuestoItemNombre?: string;
  cantidadCompradaS10?: number;
  cantidadRegistrada: number;
}

export interface ActivoRotativoMaterialUpsertDto {
  nombre: string;
  orden: number;
  presupuestoItemId?: number | null;
}

export interface PresupuestoItemBuscarDto {
  id: number;
  nombre: string;
  nombreFamilia?: string;
}

export interface ResponsableSsomaDto {
  nombre: string;
  email?: string;
}

// ─── Activos ─────────────────────────────────────────────────────────────────

export type ActivoRotativoEstado = 'disponible' | 'en_uso' | 'mantenimiento' | 'baja';

export interface ActivoRotativoListDto {
  id: number;
  materialId: number;
  materialNombre: string;
  codigo?: string;
  estado: ActivoRotativoEstado;
  proyectoActualId?: number;
  proyectoActualNombre?: string;
  responsableNombre?: string;
  responsableTelefono?: string;
  activo: boolean;
}

export interface ActivoRotativoMovimientoDto {
  id: number;
  proyectoOrigenNombre?: string;
  proyectoDestinoNombre?: string;
  fechaMovimiento: string;
  movidoPor?: string;
  observacion?: string;
}

export interface ActivoRotativoDetalleDto extends ActivoRotativoListDto {
  observaciones?: string;
  historial: ActivoRotativoMovimientoDto[];
}

export interface ActivoRotativoUpsertDto {
  materialId: number;
  codigo?: string;
  estado: ActivoRotativoEstado;
  proyectoActualId?: number | null;
  responsableNombre?: string;
  responsableTelefono?: string;
  observaciones?: string;
}

export interface ActivoRotativoMoverDto {
  nuevoProyectoId?: number | null;
  observacion?: string;
}
