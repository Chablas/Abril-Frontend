export interface LugarProyectoOptionDto {
  id: number;
  nombreDisplay: string;
}

/** Un mes del desplegable "Mes a rendir". */
export interface MesRendicionDto {
  anio: number;
  mes: number;
  /** "Agosto 2026" — ya viene capitalizado del backend. */
  label: string;
  /** Cuántas solicitudes propias aptas para rendir tiene ese mes. */
  cantidad: number;
  /**
   * Último día para rendir ese mes (YYYY-MM-DD): el 7.º día hábil del mes siguiente. Solo se
   * ofrecen meses cuyo plazo sigue abierto, así que siempre es de hoy en adelante.
   */
  fechaLimite: string;
}

/**
 * Números de las tarjetas. Se calculan sobre TODAS las solicitudes del trabajador, no sobre los
 * filtros de la tabla: son su bandeja pendiente, así que no cambian al filtrar.
 */
export interface ResumenRendicionDto {
  aptasParaRendir: number;
  capturasIncompletas: number;
  observadas: number;
}

export interface SolicitudSalidaFilterDataDto {
  lugaresProyecto: LugarProyectoOptionDto[];
  /** Meses que ofrece el desplegable "Mes a rendir" (los que tienen algo apto). */
  mesesRendicion: MesRendicionDto[];
  /** Números de las tarjetas del encabezado. */
  resumen: ResumenRendicionDto;
}
