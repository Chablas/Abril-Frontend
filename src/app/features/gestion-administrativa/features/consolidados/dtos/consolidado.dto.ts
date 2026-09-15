import {
  AreaNodeDto,
  EstadoReembolso,
  PeriodoOptionDto,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type { AreaNodeDto, EstadoReembolso, PeriodoOptionDto, TrabajadorOptionDto };

/**
 * Un Consolidado del S10 visto por la jefatura que lo tiene que firmar. La unidad de esta pantalla
 * es el CONSOLIDADO y no la planilla: un mismo registro del S10 puede cubrir varias —de uno o de
 * varios trabajadores, siempre de una misma razón social— y la decisión del reembolso las alcanza
 * a todas.
 *
 * Los agregados están acotados a lo que ESE usuario puede ver, salvo `montoTotal`, que es el
 * importe declarado en el S10 y es del documento entero.
 */
export interface ConsolidadoListItemDto {
  id: number;
  /** Número de reembolso que devolvió el S10. Null en los consolidados viejos. */
  numeroReembolso: string | null;
  /** Importe declarado en el S10: cubre las planillas completas, sin recortar por visibilidad. */
  montoTotal: number | null;
  /** Suma de las salidas visibles: lo que este usuario ve del total. */
  montoVisible: number;

  // ── Documentos ─────────────────────────────────────────────────────────
  pdfUrl: string;
  pdfFilename: string;
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  uploadedAt: string;
  /** Quién lo adjuntó (el trabajador o su consolidador). */
  subidoPor: string | null;

  // ── Qué cubre ──────────────────────────────────────────────────────────
  /**
   * Planillas cubiertas, TODAS —también las que el usuario no ve—, porque el importe declarado es
   * de ese conjunto entero. Las que no ve traen solo el código y el monto (ver `visible`).
   */
  rendiciones: ConsolidadoPlanillaDto[];
  /** Trabajadores de las salidas visibles, sin repetir. */
  trabajadores: string[];
  salidasCount: number;
  razonSocialId: number | null;
  razonSocial: string | null;

  /** "Agosto 2026", o un rango si el consolidado cruza meses. */
  periodo: string;
  periodoAnio: number;
  periodoMes: number;

  // ── Reembolso ──────────────────────────────────────────────────────────
  estadoReembolso: EstadoReembolso;
  reembolsoMixto: boolean;
  observacionReembolso: string | null;
  /**
   * Quién la escribió: "Jefatura" o "Tesorería" (RG-49). Lo que devolvió Tesorería vuelve acá para
   * que la jefatura lo firme de nuevo, así que hay que distinguirlo de la propia observación vieja.
   */
  observacionReembolsoOrigen: string;

  // ── Qué se puede hacer ─────────────────────────────────────────────────
  /** Salidas visibles con el reembolso listo para decidir. 0 = no hay nada que decidir. */
  porDecidirCount: number;
  /**
   * False cuando el consolidado cubre salidas SUYAS y el usuario no es su propio revisor: nadie
   * decide lo suyo, y la única excepción es el jefe personalizado apuntándose a sí mismo.
   */
  puedeDecidir: boolean;
}

/** Una planilla cubierta por el consolidado. */
export interface ConsolidadoPlanillaDto {
  id: number;
  /** Código REN-AAAA-NNNN. */
  codigo: string;
  /** false = el consolidado la cubre pero el usuario no ve ninguna de sus salidas. */
  visible: boolean;
  /** Monto de la planilla COMPLETA: es lo que suma contra el importe del consolidado. */
  montoTotalPlanilla: number;

  // Lo de abajo solo viene en las visibles.
  numeroPlanilla: string | null;
  periodo: string | null;
  trabajadores: string[];
  salidasCount: number;
  montoVisible: number;
  estadoReembolso: string | null;
  pdfUrl: string | null;
  pdfFilename: string | null;
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
}

/**
 * Una salida cubierta por el consolidado, para que la jefatura vea qué gasto está firmando. Es
 * solo lectura: el reembolso se decide por consolidado entero.
 */
export interface ConsolidadoSalidaDto {
  id: number;
  codigo: string | null;
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
  observacionReembolso: string | null;
}

export interface ConsolidadoDetalleDto extends ConsolidadoListItemDto {
  salidas: ConsolidadoSalidaDto[];
}

/**
 * Números de las tarjetas del encabezado, contados sobre el conjunto ya filtrado: en qué punto del
 * reembolso está cada consolidado del alcance.
 */
export interface ResumenConsolidadosDto {
  /** Esperando la decisión de la jefatura: es lo que la pantalla viene a resolver. */
  porDecidir: number;
  /** Devueltos con una observación: la pelota está en el trabajador. */
  observados: number;
  /** Ya firmados (en Tesorería o pagados). */
  firmados: number;
}

export interface ConsolidadoListResultDto {
  data: ConsolidadoListItemDto[];
  resumen: ResumenConsolidadosDto;
}

export interface ConsolidadoFilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  areaTree: AreaNodeDto[];
  periodos: PeriodoOptionDto[];
}

/**
 * Cuerpo de la decisión del reembolso. Va por CONSOLIDADO: el servidor resuelve las salidas de
 * todas sus planillas que están dentro del alcance del usuario y con el reembolso por decidir.
 */
export interface ConsolidadoAccionDto {
  consolidadoIds: number[];
  /** Obligatoria al observar: es lo único que el trabajador va a leer. */
  observacion?: string | null;
}

/** Selección sobre la que se pregunta qué correos saldrían. */
export interface ConsolidadoCorreoPreviewRequestDto {
  consolidadoIds: number[];
  /** true = la variante que aprueba (y firma); false = la que observa. */
  aprobar: boolean;
}
