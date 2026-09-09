import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import {
  AreaNodeDto,
  EstadoReembolso,
  PeriodoOptionDto,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type { AreaNodeDto, EstadoReembolso, PeriodoOptionDto, TrabajadorOptionDto };

/**
 * Una planilla en la bandeja de Tesorería: firmada por la jefatura y esperando la revisión
 * documental, ya confirmada y esperando el pago, o ya pagada. Tesorería ve TODA la organización
 * — su recorte es por estado, no por área.
 */
export interface ReembolsoListItemDto {
  id: number;
  /** Código REN-AAAA-NNNN. */
  codigo: string;
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
  /** Nombre del jefe que firmó — con firmadoAt es la firma electrónica (RG-24). */
  firmadoPor: string | null;
  consolidadoS10: ConsolidadoS10Dto | null;

  estadoReembolso: EstadoReembolso;
  reembolsoMixto: boolean;
  /** Salidas firmadas sin confirmar: mientras sea > 0, la planilla espera a Tesorería. */
  porConfirmarCount: number;
  /** Salidas ya confirmadas y sin pagar: es lo que se paga al marcar la planilla. */
  porPagarCount: number;

  // ── Trazabilidad de Tesorería ───────────────────────────────────────────
  revisionTesoreriaAt: string | null;
  revisionTesoreriaPor: string | null;
  pagadoAt: string | null;
  pagadoPor: string | null;
}

/** Una captura de movilidad (el voucher) de un tramo. */
export interface ReembolsoCapturaDto {
  id: number;
  imageUrl: string;
  filename: string;
  monto: number;
}

/** Documento adjunto de un tramo (los motivos que exigen sustento documental). */
export interface ReembolsoAdjuntoDto {
  url: string;
  filename: string;
}

/** Un tramo de una salida rendida, con su monto y sus sustentos (RF-TES-05). */
export interface ReembolsoTramoDto {
  id: number;
  orden: number;
  horaSalida: string | null;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  monto: number;
  /** true si el monto salió del tarifario de TI y no de capturas: por eso no hay voucher. */
  montoDeCatalogo: boolean;
  capturas: ReembolsoCapturaDto[];
  adjuntos: ReembolsoAdjuntoDto[];
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
  tramos: ReembolsoTramoDto[];
}

export interface ReembolsoDetalleDto extends ReembolsoListItemDto {
  salidas: ReembolsoSalidaDto[];
}

/** Números de las tarjetas, contados sobre el conjunto ya filtrado. */
export interface ResumenReembolsosDto {
  porRevisar: number;
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

/** Planillas (o salidas sueltas) sobre las que actúan las dos acciones de Tesorería. */
export interface ReembolsoSeleccionDto {
  rendicionIds: number[];
  solicitudIds: number[];
}

// ── Seguimiento (11.4 del requerimiento) ───────────────────────────────────

/** Una rendición pagada dentro del seguimiento de un colaborador. */
export interface SeguimientoRendicionDto {
  rendicionId: number;
  codigo: string;
  numeroPlanilla: string | null;
  periodo: string;
  periodoAnio: number;
  periodoMes: number;
  numeroGuia: string | null;
  salidasCount: number;
  /** Lo abonado a ESTE colaborador por esta planilla. */
  montoAbonado: number;
  estado: EstadoReembolso;
  actualizadoAt: string | null;
  pagadoPor: string | null;
  pdfFirmadoUrl: string | null;
  consolidadoS10Url: string | null;
}

/** Un colaborador con lo que Tesorería ya le abonó. */
export interface SeguimientoColaboradorDto {
  workerId: number;
  trabajador: string;
  area: string | null;
  totalAbonado: number;
  rendicionesPagadas: number;
  ultimoPagoAt: string | null;
  rendiciones: SeguimientoRendicionDto[];
}

export interface ReembolsoSeguimientoDto {
  colaboradores: SeguimientoColaboradorDto[];
  totalAbonado: number;
  rendicionesPagadas: number;
  colaboradoresCount: number;
}
