import {
  AreaNodeDto,
  EstadoReembolso,
  PeriodoOptionDto,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type { AreaNodeDto, EstadoReembolso, PeriodoOptionDto, TrabajadorOptionDto };

/**
 * Un Consolidado del S10 en la bandeja de Tesorería: firmado por la jefatura y esperando la
 * revisión documental, ya confirmado y esperando el pago, o ya pagado. La unidad de esta pantalla
 * es el CONSOLIDADO y no la planilla —un mismo registro del S10 puede cubrir varias— porque lo que
 * se revisa y se desembolsa es el documento entero: es también lo que la jefatura firmó.
 *
 * Tesorería ve TODA la organización: su recorte es por estado, no por área.
 */
export interface ReembolsoListItemDto {
  /** Id del Consolidado del S10. */
  id: number;
  /**
   * Código de la rendición grupal, `CONS-ÁREA-AAAA-NNN`: el nombre del conjunto que Tesorería paga de
   * una sola vez. Null en los consolidados anteriores a la columna.
   */
  codigo: string | null;
  /** Número de reembolso que devolvió el S10. Null en los consolidados viejos. */
  numeroReembolso: string | null;
  /**
   * La PLANILLA GRUPAL: el PDF que junta en un solo documento las planillas de gasto de todo lo que
   * cubre el consolidado. La genera Abril One al adjuntarse el S10 —no se sube— y se rehace si el
   * consolidado se reemplaza. Null en los consolidados anteriores a la columna.
   */
  planillaGrupalUrl: string | null;
  planillaGrupalFilename: string | null;
  /**
   * Copia de la planilla grupal con la firma de la jefatura: se firma junto con el consolidado al
   * aprobar el reembolso. Null mientras no se apruebe, y en los aprobados antes de que se firmara.
   */
  planillaGrupalFirmadoUrl: string | null;
  planillaGrupalFirmadoFilename: string | null;


  /** Importe declarado en el S10 para el documento entero. Null en los consolidados viejos. */
  montoS10: number | null;
  /** Lo que dice Abril One del documento entero: la suma de las planillas COMPLETAS que cubre. */
  montoPlanillas: number;
  /** Lo que se mueve desde acá: las salidas del consolidado que llegaron a Tesorería. */
  montoTotal: number;

  // ── Documentos que Tesorería revisa antes de pagar ──────────────────────
  pdfUrl: string;
  pdfFilename: string;
  /** Copia firmada por la jefatura: es el respaldo del pago. */
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  uploadedAt: string;
  /** Quién lo adjuntó: el consolidador. */
  subidoPor: string | null;
  /** Razón social bajo la que quedó el registro del S10: la del consolidador. */
  razonSocial: string | null;
  /**
   * Área del consolidado: la de su consolidador, la misma que da la sigla del código y la que
   * imprime la planilla grupal. Null si no se pudo resolver.
   */
  area: string | null;

  // ── Qué cubre ──────────────────────────────────────────────────────────
  /**
   * Planillas cubiertas, TODAS —también las que todavía esperan a su jefatura—, porque el importe
   * declarado en el S10 las incluye (ver `enBandeja`).
   */
  rendiciones: ReembolsoPlanillaDto[];
  /** Trabajadores de las salidas que llegaron a Tesorería, sin repetir. */
  trabajadores: string[];
  salidasCount: number;

  /** "Agosto 2026", o un rango si el consolidado cruza meses. */
  periodo: string;
  periodoAnio: number;
  periodoMes: number;

  /**
   * La firma electrónica que Tesorería revisa antes de proceder (RG-24). Son varias cuando el
   * consolidado cubre planillas de jefaturas distintas: cada una firmó la suya.
   */
  firmas: FirmaJefaturaDto[];

  estadoReembolso: EstadoReembolso;
  reembolsoMixto: boolean;
  /** Salidas firmadas sin confirmar: mientras sea > 0, el consolidado espera a Tesorería. */
  porConfirmarCount: number;
  /** Salidas ya confirmadas y sin pagar: es lo que se paga al marcar el consolidado. */
  porPagarCount: number;
  /**
   * Salidas que la propia Tesorería devolvió y siguen esperando la subsanación (RG-49). Mientras
   * sea > 0 el consolidado no se toca desde acá: la pelota la tiene el consolidador.
   */
  observadasCount: number;

  // ── Lo que Tesorería observó ────────────────────────────────────────────
  /** Motivo con el que se devolvió el consolidado. Null si no está observado. */
  observacionReembolso: string | null;
  observadoAt: string | null;
  observadoPor: string | null;

  // ── Trazabilidad de Tesorería ───────────────────────────────────────────
  revisionTesoreriaAt: string | null;
  revisionTesoreriaPor: string | null;
  pagadoAt: string | null;
  pagadoPor: string | null;
}

/** Un jefe que firmó alguna de las planillas del consolidado, con cuándo lo hizo. */
export interface FirmaJefaturaDto {
  nombre: string;
  firmadoAt: string | null;
}

/** Una planilla cubierta por el consolidado, con lo que Tesorería necesita de ella. */
export interface ReembolsoPlanillaDto {
  id: number;
  /** Código REN-AAAA-NNNN. */
  codigo: string;
  /**
   * false = el consolidado la cubre pero ninguna de sus salidas llegó todavía a Tesorería. Se
   * lista igual porque el importe declarado en el S10 la incluye.
   */
  enBandeja: boolean;
  /** Monto de la planilla COMPLETA: es lo que suma contra el importe del S10. */
  montoTotalPlanilla: number;

  // Lo de abajo solo viene en las que ya están en la bandeja.
  numeroPlanilla: string | null;
  periodo: string | null;
  trabajadores: string[];
  salidasCount: number;
  /** Suma de las salidas de esta planilla que llegaron a Tesorería. */
  monto: number;
  estadoReembolso: EstadoReembolso | null;
  pdfUrl: string | null;
  pdfFilename: string | null;
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  /** Jefe que firmó ESTA planilla (y con ella el consolidado). */
  firmadoPor: string | null;
}

/**
 * Una salida del consolidado, para ver el desglose antes de pagar. Sus trayectos, vouchers y
 * adjuntos (RF-TES-05) se ven con el ojo de la fila, en el mismo detalle de salida de las demás
 * pantallas.
 */
export interface ReembolsoSalidaDto {
  id: number;
  codigo: string | null;
  /** Planilla a la que pertenece: es como se agrupan las salidas en el detalle. */
  rendicionId: number;
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
  porRevisar: number;
  porPagar: number;
  montoPorPagar: number;
  /** Consolidados que Tesorería devolvió y esperan la subsanación (RG-49). */
  observadas: number;
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

/** Consolidados sobre los que actúan las tres acciones de Tesorería. */
export interface ReembolsoSeleccionDto {
  consolidadoIds: number[];
}

/** Lo mismo, con el motivo obligatorio con el que Tesorería devuelve el consolidado (RG-49). */
export interface ReembolsoObservacionDto extends ReembolsoSeleccionDto {
  observacion: string;
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
  numeroReembolso: string | null;
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
