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

export interface SolicitudSalidaFilterDataDto {
  lugaresProyecto: LugarProyectoOptionDto[];
  /** Meses que ofrece el desplegable "Mes a rendir" (los que tienen algo apto). */
  mesesRendicion: MesRendicionDto[];
}
