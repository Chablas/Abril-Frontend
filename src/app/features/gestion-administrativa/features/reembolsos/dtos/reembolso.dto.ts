import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import {
  AreaNodeDto,
  EstadoReembolso,
  PeriodoOptionDto,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type { AreaNodeDto, EstadoReembolso, PeriodoOptionDto, TrabajadorOptionDto };

/**
 * Una planilla en la bandeja de Tesorería: ya firmada por la jefatura y esperando el pago, o ya
 * pagada. Tesorería ve TODA la organización — su recorte es por estado, no por área.
 */
export interface ReembolsoListItemDto {
  id: number;
  numeroPlanilla: string | null;
  rendidoAt: string;

  periodo: string;
  periodoAnio: number;
  periodoMes: number;

  trabajadores: string[];
  salidasCount: number;
  /** Lo que hay que reembolsar por esta planilla. */
  montoTotal: number;

  // ── Documentos que Tesorería revisa antes de pagar ──────────────────────
  pdfUrl: string;
  pdfFilename: string;
  /** Copia firmada por la jefatura: es el respaldo del pago. */
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  consolidadoS10: ConsolidadoS10Dto | null;

  estadoReembolso: EstadoReembolso;
  reembolsoMixto: boolean;
  /** Salidas firmadas y todavía sin pagar: es lo que se paga al marcar la planilla. */
  porPagarCount: number;
}

/** Una salida de la planilla, para ver el desglose antes de pagar. */
export interface ReembolsoSalidaDto {
  id: number;
  codigo: string | null;
  trabajador: string;
  area: string | null;
  fechaSalida: string;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  trayectosCount: number;
  monto: number;
  estadoReembolso: EstadoReembolso;
}

export interface ReembolsoDetalleDto extends ReembolsoListItemDto {
  salidas: ReembolsoSalidaDto[];
}

/** Números de las tarjetas, contados sobre el conjunto ya filtrado. */
export interface ResumenReembolsosDto {
  porPagar: number;
  montoPorPagar: number;
  pagadas: number;
}

export interface ReembolsoListResultDto {
  data: ReembolsoListItemDto[];
  resumen: ResumenReembolsosDto;
}

export interface ReembolsoFilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  areaTree: AreaNodeDto[];
  periodos: PeriodoOptionDto[];
}

/** Planillas (o salidas sueltas) que Tesorería marca como pagadas. */
export interface PagarDto {
  rendicionIds: number[];
  solicitudIds: number[];
}
