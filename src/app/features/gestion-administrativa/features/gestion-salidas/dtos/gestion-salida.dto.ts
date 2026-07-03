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

export interface GestionSalidaTrayectoDto {
  id: number;
  orden: number;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
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
