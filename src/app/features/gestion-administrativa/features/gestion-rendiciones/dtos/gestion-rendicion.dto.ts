import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import {
  AreaNodeDto,
  EstadoReembolso,
  PeriodoOptionDto,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type { AreaNodeDto, EstadoReembolso, PeriodoOptionDto, TrabajadorOptionDto };

/**
 * Una planilla de rendición vista por el revisor. Los agregados están acotados a las salidas que
 * ESE usuario puede ver (misma visibilidad que Gestión de Salidas): una planilla puede agrupar a
 * trabajadores de varias áreas y no todas le competen.
 */
export interface GestionRendicionListItemDto {
  id: number;
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

  // ── Documentos ─────────────────────────────────────────────────────────
  pdfUrl: string;
  pdfFilename: string;
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  consolidadoS10: ConsolidadoS10Dto | null;

  // ── Reembolso ──────────────────────────────────────────────────────────
  /** Resumen de las salidas visibles: gana el estado que más atención pide. */
  estadoReembolso: EstadoReembolso;
  reembolsoMixto: boolean;
  observacionReembolso: string | null;
  revisorNotificadoAt: string | null;

  // ── Qué se puede hacer con esta planilla ───────────────────────────────
  /** Salidas con el reembolso listo para decidir (rendidas, con S10 y sin decidir). */
  porDecidirCount: number;
  /** Salidas con el reembolso aprobado y todavía sin firmar. */
  porFirmarCount: number;
  /** True si alguna salida visible es del propio revisor: no puede decidirla salvo que sea Gerente. */
  incluyePropias: boolean;
}

/** Una salida de la planilla, para decidir su reembolso una por una desde el detalle. */
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
  porDecidir: boolean;
  esPropia: boolean;
}

export interface GestionRendicionDetalleDto extends GestionRendicionListItemDto {
  salidas: GestionRendicionSalidaDto[];
}

/**
 * Números de las tarjetas del encabezado, contados sobre el conjunto ya filtrado: las tres cosas
 * que esperan al revisor, en el orden del flujo.
 */
export interface ResumenGestionRendicionesDto {
  sinConsolidado: number;
  porRevisar: number;
  porFirmar: number;
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
export interface ReembolsoAccionDto {
  rendicionIds: number[];
  solicitudIds: number[];
  /** Obligatoria al rechazar: es lo único que el trabajador va a leer. */
  observacion?: string | null;
}
