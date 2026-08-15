export interface GestionSalidaListItemDto {
  id: number;
  workerId: number;
  trabajador: string;
  /**
   * Área del trabajador: solo el área más baja a la que pertenece (el nodo de
   * workers.area_scope_id). La ruta completa va en el detalle (`areaRuta`).
   */
  area: string | null;
  /**
   * Nombre completo del jefe/revisor del solicitante — el mismo al que se le notificó la
   * solicitud. Cuando la resolución cae al fallback de GTH es el nombre del área.
   */
  revisorNombre: string | null;
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
  /** Hora real de salida registrada por recepción ("HH:mm:ss") — dato extra. */
  horaSalidaReal: string | null;
  /** Hora real de retorno registrada por recepción ("HH:mm:ss") — dato extra. */
  horaRetornoReal: string | null;
  /**
   * True cuando todos los trayectos tienen motivos con "es hora estimada": las horas declaradas
   * son estimadas y recepción no registra la hora real de salida/retorno para esta solicitud.
   */
  esHoraEstimada: boolean;
  /**
   * True si el usuario logueado puede aprobar/rechazar esta salida. False cuando es su propia
   * salida y no es Gerente (nadie aprueba lo suyo salvo gerentes). No afecta la rendición.
   */
  puedeDecidir: boolean;
  /**
   * True si la salida es del propio usuario logueado. Habilita "Cancelar": un trabajador solo
   * puede cancelar SUS propias solicitudes Pendientes.
   */
  esPropia: boolean;
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
  /** Área más baja del trabajador (último nodo de `areaRuta`). */
  area: string | null;
  /**
   * Ruta completa del área, de la raíz al nodo del trabajador
   * (ej. ['Gerencia de Proyectos', 'Unidad de Proyectos', 'Unidad de Proyectos']).
   */
  areaRuta: string[];
  /** Nombre completo del jefe/revisor (o el área en el fallback de GTH). */
  revisorNombre: string | null;
  /** Correo corporativo al que se le notificó la solicitud. */
  revisorEmail: string | null;
  fechaSalida: string;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  motivoRechazo: string | null;
  rendicion: GestionSalidaRendicionDto | null;
  trayectos: GestionSalidaTrayectoDto[];
}
