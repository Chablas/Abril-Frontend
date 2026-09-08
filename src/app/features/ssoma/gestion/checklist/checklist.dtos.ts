// ─── Plantillas (catálogo maestro) ──────────────────────────────────────────

export interface ChecklistPlantillaListDto {
  id: number;
  nombre: string;
  descripcion?: string;
  tipoActivacion: string; // 'automatico' | 'manual'
  eventoActivacion?: string;
  esObligatorio: boolean;
  orden: number;
  activo: boolean;
  totalItems: number;
  partidaId?: number;
  partidaNombre?: string;
}

export interface ChecklistItemImagenDto {
  id: number;
  url: string;
  orden: number;
}

export interface ChecklistPlantillaItemDto {
  id: number;
  descripcion: string;
  orden: number;
  tieneAdjuntoRef: boolean;
  activo: boolean;
  imagenesReferencia: ChecklistItemImagenDto[];
}

// ─── Partidas (etapas constructivas) ────────────────────────────────────────

export interface ChecklistPartidaDto {
  id: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  totalPlantillas: number;
}

export interface ChecklistPartidaUpsertDto {
  nombre: string;
  descripcion?: string;
  orden: number;
}

export interface ChecklistPlantillaItemCreateDto {
  descripcion: string;
  tieneAdjuntoRef: boolean;
}

export interface ChecklistPlantillaItemEditDto {
  descripcion: string;
  tieneAdjuntoRef: boolean;
  activo: boolean;
}

export interface ChecklistPlantillaDetalleDto extends ChecklistPlantillaListDto {
  items: ChecklistPlantillaItemDto[];
}

export interface ChecklistPlantillaUpsertDto {
  nombre: string;
  descripcion?: string;
  tipoActivacion: string;
  eventoActivacion?: string;
  esObligatorio: boolean;
  orden: number;
  partidaId?: number;
}

// ─── Checklists de Proyecto ──────────────────────────────────────────────────

export interface ChecklistProyectoCardDto {
  checklistProyectoId: number;
  plantillaId: number;
  nombrePlantilla: string;
  esObligatorio: boolean;
  partidaId?: number;
  partidaNombre?: string;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'no_aplica';
  porcentajeCompletado: number;
  totalItems: number;
  itemsCompletados: number;
  fechaActivacion: string;
  fechaCompletado?: string;
  activadoPor?: string;
  noAplicaMotivo?: string;
}

export interface ChecklistProyectoResumenDto {
  proyectoId: number;
  checklists: ChecklistProyectoCardDto[];
}

export interface ChecklistProyectoItemDto {
  id: number;
  plantillaItemId: number;
  descripcion: string;
  orden: number;
  tieneAdjuntoRef: boolean;
  completado: boolean;
  fechaCompletado?: string;
  completadoPor?: string;
  observacion?: string;
  urlAdjunto?: string;
  imagenesReferencia: ChecklistItemImagenDto[];
}

export interface ChecklistProyectoDetalleDto {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  plantillaId: number;
  nombrePlantilla: string;
  esObligatorio: boolean;
  estado: string;
  porcentajeCompletado: number;
  fechaActivacion: string;
  fechaCompletado?: string;
  noAplicaMotivo?: string;
  noAplicaPor?: string;
  noAplicaFecha?: string;
  items: ChecklistProyectoItemDto[];
}

export interface ChecklistItemToggleDto {
  completado: boolean;
  observacion?: string;
  urlAdjunto?: string;
}

export interface ChecklistActivarDto {
  plantillaId: number;
}

export interface ChecklistNoAplicaDto {
  motivo: string;
}
