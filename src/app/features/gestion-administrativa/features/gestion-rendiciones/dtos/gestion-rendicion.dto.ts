import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import {
  AreaNodeDto,
  EstadoPrimeraRevision,
  EstadoReembolso,
  PeriodoOptionDto,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type {
  AreaNodeDto, EstadoPrimeraRevision, EstadoReembolso, PeriodoOptionDto, TrabajadorOptionDto,
};

/**
 * Una planilla de rendición vista por el revisor. Los agregados están acotados a las salidas que
 * ESE usuario puede ver (misma visibilidad que Gestión de Salidas): una planilla puede agrupar a
 * trabajadores de varias áreas y no todas le competen.
 */
export interface GestionRendicionListItemDto {
  id: number;
  /** Código REN-AAAA-NNNN: es como el trabajador la nombra en los correos. */
  codigo: string;
  numeroPlanilla: string | null;
  rendidoAt: string;

  /** "Agosto 2026", o un rango si la planilla cruza meses. */
  periodo: string;
  periodoAnio: number;
  periodoMes: number;

  /** Trabajadores visibles que aparecen en la planilla, sin repetir. */
  trabajadores: string[];
  salidasCount: number;
  montoTotal: number;
  /**
   * Monto de la planilla COMPLETA (todas sus salidas, de todos sus trabajadores). Es el importe
   * que se registró en el S10, así que es contra este —y no contra `montoTotal`, que viene
   * recortado— que tiene que cuadrar el monto del Consolidado del S10.
   */
  montoTotalPlanilla: number;

  // ── Documentos ─────────────────────────────────────────────────────────
  pdfUrl: string;
  pdfFilename: string;
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  consolidadoS10: ConsolidadoS10Dto | null;

  // ── Primera revisión ───────────────────────────────────────────────────
  // El paso que va ANTES del Consolidado del S10: se miran tramos, montos y capturas y se decide.
  // Es de la planilla, así que no se resume de las salidas como el reembolso.

  estadoPrimeraRevision: EstadoPrimeraRevision;
  /** Cuándo la envió el trabajador. Null si todavía no la envió. */
  enviadaRevisionAt: string | null;
  /** Cuándo se decidió. Null si todavía no se decidió. */
  primeraRevisionAt: string | null;
  /** Comentario con el que se observó. Null si no se observó. */
  primeraRevisionObservacion: string | null;
  /** True si está esperando la primera revisión: se puede aprobar u observar. */
  porPrimeraRevision: boolean;

  // ── Reembolso ──────────────────────────────────────────────────────────
  /** Resumen de las salidas visibles: gana el estado que más atención pide. */
  estadoReembolso: EstadoReembolso;
  reembolsoMixto: boolean;
  observacionReembolso: string | null;
  revisorNotificadoAt: string | null;

  // ── Qué se puede hacer con esta planilla ───────────────────────────────
  /** Salidas con el reembolso listo para decidir (rendidas, con S10 y sin decidir). */
  porDecidirCount: number;
  /**
   * True si el usuario puede decidir sobre esta planilla (su primera revisión y el reembolso de
   * sus salidas). False cuando incluye salidas SUYAS y él no es su propio revisor: nadie decide
   * lo suyo, y la única excepción es tener el jefe personalizado apuntándose a sí mismo.
   */
  puedeDecidir: boolean;
}

/**
 * Una salida de la planilla, para que el revisor vea qué agrupa el documento que está decidiendo.
 * Es solo lectura: el reembolso se decide por planilla entera (`puedeDecidir` + `porDecidirCount`
 * de la planilla), no salida por salida.
 */
export interface GestionRendicionSalidaDto {
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
  observacionReembolso: string | null;
}

/**
 * Destinatarios REALES de un correo del flujo, ya resueltos por el backend con la configuración
 * de Configuración → Correos. `para` vacío = no le llega a nadie.
 */
export interface CorreoDestinatariosDto {
  para: string[];
  copia: string[];
}

export interface GestionRendicionDetalleDto extends GestionRendicionListItemDto {
  salidas: GestionRendicionSalidaDto[];
  /**
   * A quién le llega el aviso de «reembolso aprobado» si el revisor aprueba esta planilla, según
   * Configuración → Correos → «Reembolso OK». El destinatario principal es cada solicitante de
   * las salidas por decidir, así que la lista es de esta planilla y no de la pantalla.
   */
  correoReembolsoAprobado: CorreoDestinatariosDto;
}

/**
 * Números de las tarjetas del encabezado, contados sobre el conjunto ya filtrado: las tres cosas
 * que esperan al revisor, en el orden del flujo.
 */
export interface ResumenGestionRendicionesDto {
  /** Planillas esperando la PRIMERA revisión: el primer paso del revisor. */
  primeraRevision: number;
  /** Aprobadas en primera revisión y sin Consolidado del S10: la pelota está en el trabajador. */
  sinConsolidado: number;
  /** Con reembolso por decidir (con S10 adjunto) — la segunda revisión. */
  porRevisar: number;
  /** Con reembolso aprobado esperando la firma. */
}

export interface GestionRendicionListResultDto {
  data: GestionRendicionListItemDto[];
  resumen: ResumenGestionRendicionesDto;
}

export interface GestionRendicionFilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  areaTree: AreaNodeDto[];
  periodos: PeriodoOptionDto[];
}

/**
 * Cuerpo de las acciones en bloque. Se manda una de las dos cosas: las planillas completas (lo
 * normal, desde la tabla) o salidas sueltas (desde el detalle, cuando el revisor decide una por
 * una).
 */
/**
 * Cuerpo de la decisión de la PRIMERA revisión. Va por planilla y no por salida: lo que se revisa
 * es el documento entero y la decisión es total.
 */
export interface PrimeraRevisionAccionDto {
  rendicionIds: number[];
  /** Obligatoria al observar: es el comentario que el trabajador va a leer. */
  observacion?: string | null;
}

export interface ReembolsoAccionDto {
  rendicionIds: number[];
  solicitudIds: number[];
  /** Obligatoria al rechazar: es lo único que el trabajador va a leer. */
  observacion?: string | null;
}
