import {
  AreaNodeDto,
  CorreccionS10Dto,
  EstadoReembolso,
  PeriodoOptionDto,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type { AreaNodeDto, EstadoReembolso, PeriodoOptionDto, TrabajadorOptionDto };

/**
 * Un Consolidado del S10 visto por la jefatura que lo tiene que firmar y por el consolidador que lo
 * adjuntó. La unidad de esta pantalla es el CONSOLIDADO y no la planilla: un mismo registro del S10
 * puede cubrir varias —de uno o de varios trabajadores, de las razones sociales que sean— y la
 * decisión del reembolso las alcanza a todas.
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
  /** Quién lo adjuntó: el consolidador. */
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
  /**
   * Razón social bajo la que quedó el registro del S10: la del consolidador que lo adjuntó, no la
   * de los trabajadores, que pueden ser de varias. Null si no la tiene cargada.
   */
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

  // ── Qué puede hacer la jefatura ────────────────────────────────────────
  /**
   * Salidas con el reembolso por decidir que le tocan a ESTE usuario: las de los trabajadores de
   * los que es la jefatura. 0 = no tiene nada que decidir acá aunque vea el consolidado: el
   * consolidador, un gerente o GTH lo ven, pero no lo aprueban.
   */
  porDecidirCount: number;

  // ── Qué puede hacer el consolidador ────────────────────────────────────
  /**
   * True si el usuario es el consolidador de TODOS los trabajadores que cubre (Consolidados →
   * Configuración → Consolidadores): los trámites de abajo son suyos.
   */
  puedeConsolidar: boolean;
  /**
   * Hay reembolsos Pendientes que decide otra jefatura: el consolidador le puede avisar, y repetir
   * el aviso (un correo se pierde).
   */
  puedeAvisarJefatura: boolean;
  /** Último aviso a la jefatura por este consolidado. Null si nunca. */
  jefaturaAvisadaAt: string | null;
  /**
   * El reembolso está observado y no hay otra corrección en curso: el consolidador puede pedirle la
   * corrección al Coordinador ERP. Es un camino alternativo a volver a adjuntar el consolidado.
   */
  puedeSolicitarCorreccion: boolean;
  /**
   * La corrección con el Coordinador ERP que está viva en alguna de sus planillas. Null en el caso
   * normal: casi ningún consolidado pasa por el ERP.
   */
  correccionS10: CorreccionS10Dto | null;
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
 * solo lectura: el reembolso se decide por consolidado entero, y el ojo abre su detalle.
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
  /** Con algo que le toca decidir a este usuario: es lo que la jefatura viene a resolver. */
  porDecidir: number;
  /** Devueltos con una observación: la pelota está en el consolidador. */
  observados: number;
  /** Ya firmados y en manos de Tesorería (por revisar o por pagar). */
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
 * todas sus planillas que le toca decidir al usuario y que tienen el reembolso por decidir.
 */
export interface ConsolidadoAccionDto {
  consolidadoIds: number[];
  /** Obligatoria al observar: es lo que el consolidador va a leer para subsanar. */
  observacion?: string | null;
}

/**
 * Qué acción se está por confirmar, y por eso de qué correo se pregunta. `REEMBOLSO` (o nada) es la
 * decisión de la jefatura; las otras dos son trámites del consolidador sobre UN consolidado.
 */
export type ConsolidadoCorreoAccion = 'REEMBOLSO' | 'AVISO_JEFATURA' | 'CORRECCION_ERP';

/** Selección sobre la que se pregunta qué correos saldrían. */
export interface ConsolidadoCorreoPreviewRequestDto {
  consolidadoIds: number[];
  /** Solo en la decisión: true = la variante que aprueba (y firma); false = la que observa. */
  aprobar: boolean;
  accion?: ConsolidadoCorreoAccion;
}
