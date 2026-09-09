// ─── Categorías ──────────────────────────────────────────────────────────────

export interface ActivoRotativoCategoriaDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
  totalActivos: number;
}

export interface ActivoRotativoCategoriaUpsertDto {
  nombre: string;
  orden: number;
}

// ─── Activos ─────────────────────────────────────────────────────────────────

export type ActivoRotativoEstado = 'disponible' | 'en_uso' | 'mantenimiento' | 'baja';

export interface ActivoRotativoListDto {
  id: number;
  nombre: string;
  categoriaId: number;
  categoriaNombre: string;
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
  nombre: string;
  categoriaId: number;
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
