import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

/** Estados del reembolso de una planilla (resumen de los de sus salidas). */
export type EstadoReembolso = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Firmado' | 'Pagado';

/**
 * Una planilla de rendición del trabajador: un PDF que agrupa N salidas y equivale a un registro
 * en el S10. Es la unidad de esta pantalla.
 *
 * Los conteos y el monto están acotados a las salidas PROPIAS (una planilla generada por el
 * revisor puede mezclar a varias personas); los documentos son de la planilla entera.
 */
export interface RendicionListItemDto {
  id: number;
  /** Correlativo impreso en la planilla ("TI: 000123"). Null en las que no lo tienen. */
  numeroPlanilla: string | null;
  rendidoAt: string;
  /** "Agosto 2026", o "Julio — Agosto 2026" si la planilla cruza meses. */
  periodo: string;
  periodoAnio: number;
  periodoMes: number;
  salidasCount: number;
  montoTotal: number;

  // ── Documentos de la planilla ──────────────────────────────────────────
  pdfUrl: string;
  pdfFilename: string;
  /** Copia firmada por la jefatura. Null mientras nadie la firme. */
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  /** Consolidado del S10 vigente de la planilla. Null si todavía no se adjuntó. */
  consolidadoS10: ConsolidadoS10Dto | null;

  // ── Reembolso ──────────────────────────────────────────────────────────
  /** Resumen de las salidas propias: gana el estado que más atención pide. */
  estadoReembolso: EstadoReembolso;
  /** True si las salidas propias no están todas en el mismo estado. */
  reembolsoMixto: boolean;
  /** Lo que el jefe observó al rechazar: es lo que hay que subsanar. */
  observacionReembolso: string | null;
  revisorNotificadoAt: string | null;
  puedeAdjuntarConsolidado: boolean;
  puedeNotificarRevisor: boolean;
}

/** Una salida dentro de la planilla. */
export interface RendicionSalidaDto {
  id: number;
  codigo: string | null;
  fechaSalida: string;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  trayectosCount: number;
  monto: number;
  estadoReembolso: EstadoReembolso;
  observacionReembolso: string | null;
}

export interface RendicionDetalleDto extends RendicionListItemDto {
  salidas: RendicionSalidaDto[];
}

/**
 * Números de las tarjetas del encabezado. Se cuentan sobre el MISMO conjunto que muestra la tabla
 * (con los filtros ya aplicados), así que acompañan a la búsqueda: por eso viajan con el listado y
 * no con los datos de los filtros.
 */
export interface ResumenRendicionesDto {
  sinConsolidado: number;
  porAvisar: number;
  observadas: number;
}

export interface RendicionListResultDto {
  data: RendicionListItemDto[];
  resumen: ResumenRendicionesDto;
}

/** Un periodo del filtro (mes con al menos una planilla propia). */
export interface PeriodoOptionDto {
  anio: number;
  mes: number;
  /** "Agosto 2026" — ya viene capitalizado del backend. */
  label: string;
}

export interface RendicionFilterDataDto {
  periodos: PeriodoOptionDto[];
}
