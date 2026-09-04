export interface SolicitudSalidaListItemDto {
  id: number;
  /** Código SOL-AAAA-NNNN. Null solo en solicitudes anteriores a la columna. */
  codigo: string | null;
  fechaSalida: string;
  /** Hora de salida del primer trayecto. Null si el motivo no pide horario. */
  horaSalida: string | null;
  /** Hora de retorno del último trayecto. */
  horaRetorno: string | null;
  /** Motivo del primer trayecto. */
  motivo: string;
  /** Origen del primer trayecto. */
  lugarOrigen: string | null;
  /** Destino del último trayecto. */
  lugarDestino: string | null;
  trayectosCount: number;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  /** True si todos los trayectos tienen capturas (o catálogo TI) — habilita la rendición. */
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
   * True si la salida está lista para rendirse: aprobada, no rendida, con los trayectos cubiertos,
   * con motivo reembolsable y dentro del plazo. Lo calcula el backend: es la misma condición que
   * usan el desplegable "Mes a rendir" y las tarjetas del encabezado.
   */
  aptaParaRendir: boolean;

  // ── Reembolso ────────────────────────────────────────────────────────
  // Solo informativo acá: el reembolso se sigue por PLANILLA, y adjuntar el Consolidado del S10
  // o avisarle al revisor son acciones de Mis Rendiciones.

  /**
   * Visto bueno de la jefatura al GASTO, una vez rendida la salida y adjunto el Consolidado del
   * S10: "Pendiente" | "Aprobado" | "Rechazado" | "Firmado" | "Pagado".
   */
  estadoReembolso: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Firmado' | 'Pagado';
  /** Lo que el jefe observó al rechazar: es lo que hay que subsanar. */
  observacionReembolso: string | null;
}

/**
 * Números de las tarjetas del encabezado. Se cuentan sobre el MISMO conjunto que muestra la tabla
 * (con los filtros ya aplicados), así que acompañan a la búsqueda: por eso viajan con el listado y
 * no con los datos de los filtros.
 */
export interface ResumenRendicionDto {
  aptasParaRendir: number;
  capturasIncompletas: number;
  observadas: number;
}

/** Respuesta del listado: las filas y las tarjetas, contadas sobre ese mismo conjunto filtrado. */
export interface SolicitudSalidaListResultDto {
  data: SolicitudSalidaListItemDto[];
  resumen: ResumenRendicionDto;
}
