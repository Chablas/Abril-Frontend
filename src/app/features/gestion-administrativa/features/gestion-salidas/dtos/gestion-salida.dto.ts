import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

export interface GestionSalidaListItemDto {
  id: number;
  /** Código SOL-AAAA-NNNN. Null solo en solicitudes anteriores a la columna. */
  codigo: string | null;
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
  /** Null cuando el motivo no pide horario. */
  horaSalida: string | null;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  trayectosCount: number;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  puedeRendirse: boolean;
  /**
   * True si al menos un trayecto lleva un motivo marcado como reembolsable en
   * Configuración → Motivos. Sin eso la salida no genera gasto de movilidad y no hay qué rendir.
   */
  esReembolsable: boolean;
  /**
   * Último día para rendir esta salida (YYYY-MM-DD): el 7.º día hábil del mes siguiente al de su
   * fecha de salida, sin sábados, domingos ni los feriados de Configuración → Feriados.
   */
  plazoRendicionHasta: string;
  /** True si el plazo ya pasó: la salida ya no se rinde, pero su detalle se sigue viendo. */
  plazoVencido: boolean;
  /**
   * True si la salida está lista para rendirse: aprobada, no rendida, con los trayectos cubiertos
   * (`puedeRendirse`), con motivo reembolsable (`esReembolsable`) y dentro del plazo. Lo calcula el
   * backend: es la misma condición que usan el desplegable "Mes a rendir" y las tarjetas.
   */
  aptaParaRendir: boolean;
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

  // ── Reembolso ────────────────────────────────────────────────────────
  // Solo informativo acá: adjuntar el Consolidado del S10, decidir el reembolso y firmar la
  // planilla son de Gestión de Rendiciones, y el pago de Reembolsos (Tesorería).

  /**
   * Eje aparte de la aprobación de la salida y de la rendición: es el visto bueno al GASTO.
   * "Pendiente" | "Aprobado" | "Rechazado" | "Firmado" | "Pagado".
   */
  estadoReembolso: EstadoReembolso;
  /**
   * True cuando ya hay algo que revisar: la salida está rendida y tiene adjunto el Consolidado
   * del S10. Acá solo sirve para no pintar un badge "Pendiente" engañoso.
   */
  reembolsoRevisable: boolean;
  /** Observación del último rechazo — lo que el trabajador tiene que subsanar. */
  observacionReembolso: string | null;
  /** Nombre de quien aprobó/rechazó el reembolso. */
  reembolsoDecididoPor: string | null;
  reembolsoDecididoAt: string | null;
}

/** Los cinco estados por los que pasa el reembolso de una salida rendida. */
export type EstadoReembolso = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Firmado' | 'Pagado';

/** Respuesta paginada genérica del backend (PagedResult<T>). */
export interface PagedResponseDto<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}

/**
 * Respuesta del listado: la página de la tabla más los números de las tarjetas, contados sobre
 * todo el conjunto filtrado (no sobre la página). Van juntos para que un cambio de filtro se
 * resuelva en una sola petición.
 */
export interface GestionSalidaPagedDto extends PagedResponseDto<GestionSalidaListItemDto> {
  resumen: ResumenRendicionDto;
}

export interface GestionSalidaFilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  lugaresProyecto: LugarProyectoOptionDto[];
  /** Árbol area_scope (lista plana) para el filtro de área en cascada. */
  areaTree: AreaNodeDto[];
  /** Meses que ofrece el desplegable "Mes a rendir" (los que tienen algo apto). */
  mesesRendicion: MesRendicionDto[];
}

/** Un mes del desplegable "Mes a rendir". */
export interface MesRendicionDto {
  anio: number;
  mes: number;
  /** "Agosto 2026" — ya viene capitalizado del backend. */
  label: string;
  /** Cuántas solicitudes aptas para rendir tiene ese mes dentro del alcance del usuario. */
  cantidad: number;
  /**
   * Último día para rendir ese mes (YYYY-MM-DD): el 7.º día hábil del mes siguiente. Solo se
   * ofrecen meses cuyo plazo sigue abierto, así que siempre es de hoy en adelante.
   */
  fechaLimite: string;
}

/**
 * Números de las tarjetas del encabezado. Se cuentan sobre el MISMO conjunto filtrado que alimenta
 * la tabla —todas las páginas, no solo la visible—, así que acompañan a la búsqueda: por eso
 * viajan con el listado y no con los datos de los filtros.
 */
export interface ResumenRendicionDto {
  aptasParaRendir: number;
  capturasIncompletas: number;
  observadas: number;
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
  /** webUrl de la copia FIRMADA por la jefatura. Null mientras nadie la firme. */
  pdfFirmadoUrl: string | null;
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
  /** Null cuando el motivo no pide horario. */
  horaSalida: string | null;
  horaRetorno: string | null;
  motivo: string;
  /** Detalle que acompaña al motivo cuando este lo exige. Null si no aplica. */
  motivoAdicional: string | null;
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
  /** Código SOL-AAAA-NNNN. Null solo en solicitudes anteriores a la columna. */
  codigo: string | null;
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

  // ── Reembolso ────────────────────────────────────────────────────────
  estadoReembolso: EstadoReembolso;
  observacionReembolso: string | null;
  reembolsoDecididoPor: string | null;
  reembolsoDecididoAt: string | null;
  firmadoPor: string | null;
  firmadoAt: string | null;
  pagadoPor: string | null;
  pagadoAt: string | null;

  rendicion: GestionSalidaRendicionDto | null;
  /** Consolidado del S10 vigente (propio de la salida o heredado de su planilla). Null si no hay. */
  consolidadoS10: ConsolidadoS10Dto | null;
  trayectos: GestionSalidaTrayectoDto[];
}
