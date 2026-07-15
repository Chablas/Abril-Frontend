export interface GestionSalidaListItemDto {
  id: number;
  workerId: number;
  trabajador: string;
  fechaSalida: string;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  trayectosCount: number;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  puedeRendirse: boolean;
  /** Hora real registrada por recepción ("HH:mm:ss") — dato extra. */
  horaSalidaReal: string | null;
  /**
   * True si el usuario logueado puede aprobar/rechazar esta salida. False cuando es su propia
   * salida y no es Gerente (nadie aprueba lo suyo salvo gerentes). No afecta la rendición.
   */
  puedeDecidir: boolean;
}

/** Respuesta paginada genérica del backend (PagedResult<T>). */
export interface PagedResponseDto<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}

export interface GestionSalidaFilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  lugaresProyecto: LugarProyectoOptionDto[];
  /** Árbol area_scope (lista plana) para el filtro de área en cascada. */
  areaTree: AreaNodeDto[];
}

/** Nodo del árbol area_scope; el frontend arma la jerarquía a partir de la lista plana. */
export interface AreaNodeDto {
  areaScopeId: number;
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaScopeParentId?: number | null;
  displayOrder: number;
}

export interface TrabajadorOptionDto {
  workerId: number;
  nombreCompleto: string;
}

export interface LugarProyectoOptionDto {
  gaLugarId: number;
  nombreDisplay: string;
}

export interface GestionSalidaRendicionDto {
  id: number;
  pdfUrl: string;
  pdfFilename: string;
  rendidoAt: string;
}

export interface GestionSalidaCapturaDto {
  id: number;
  imageUrl: string;
  filename: string;
  monto: number;
  uploadedAt: string;
}

export interface GestionSalidaAdjuntoDto {
  url: string;
  filename: string;
}

export interface GestionSalidaTrayectoDto {
  id: number;
  orden: number;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  /** Documentos adjuntos del trayecto (motivos que requieren documento). Vacío si no tiene. */
  adjuntos: GestionSalidaAdjuntoDto[];
  capturas: GestionSalidaCapturaDto[];
  /** Monto del catálogo ga_trayecto (solo trabajador TI con match). */
  montoCatalogo: number | null;
  /** Monto efectivo: suma capturas o montoCatalogo. */
  montoTotal: number;
}

export interface GestionSalidaDetalleDto {
  id: number;
  workerId: number;
  trabajador: string;
  fechaSalida: string;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  motivoRechazo: string | null;
  rendicion: GestionSalidaRendicionDto | null;
  trayectos: GestionSalidaTrayectoDto[];
}
