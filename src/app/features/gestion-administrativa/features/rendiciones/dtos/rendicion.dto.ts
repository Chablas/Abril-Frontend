import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { EstadoPrimeraRevision } from '../../../shared/dtos/rendicion-shared.dto';

export type { EstadoPrimeraRevision };

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
  /**
   * Código REN-AAAA-NNNN: es como el trabajador nombra su rendición, y lo que se conserva cuando
   * una rendición observada se vuelve a generar.
   */
  codigo: string;
  /** Correlativo impreso en la planilla ("TI: 000123"). Null en las que no lo tienen. */
  numeroPlanilla: string | null;
  rendidoAt: string;
  /** "Agosto 2026", o "Julio — Agosto 2026" si la planilla cruza meses. */
  periodo: string;
  periodoAnio: number;
  periodoMes: number;
  salidasCount: number;
  montoTotal: number;
  /**
   * Monto de la planilla COMPLETA (todas sus salidas, de todos sus trabajadores). Es el importe
   * que se registró en el S10, así que es contra este —y no contra `montoTotal`, que viene
   * recortado— que tiene que cuadrar el monto del Consolidado del S10.
   */
  montoTotalPlanilla: number;

  // ── Documentos de la planilla ──────────────────────────────────────────
  pdfUrl: string;
  pdfFilename: string;
  /** Copia firmada por la jefatura. Null mientras nadie la firme. */
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  /** Consolidado del S10 vigente de la planilla. Null si todavía no se adjuntó. */
  consolidadoS10: ConsolidadoS10Dto | null;

  // ── Primera revisión ───────────────────────────────────────────────────
  // El paso que va ANTES del Consolidado del S10: el jefe revisa tramos, montos y capturas.
  // Es de la planilla, así que no se resume de las salidas como el reembolso.

  estadoPrimeraRevision: EstadoPrimeraRevision;
  /** Cuándo se envió a primera revisión. Null si todavía no se envió. */
  enviadaRevisionAt: string | null;
  /** Cuándo decidió el jefe. Null si todavía no decidió. */
  primeraRevisionAt: string | null;
  /** Comentario del jefe al observar: es lo que hay que corregir. */
  primeraRevisionObservacion: string | null;
  /** True si está "Lista para enviar": se puede mandar a primera revisión. */
  puedeEnviarPrimeraRevision: boolean;
  /** True si está observada: hay que corregir capturas y montos y volver a generarla. */
  puedeSubsanar: boolean;

  // ── Reembolso ──────────────────────────────────────────────────────────
  /** Resumen de las salidas propias: gana el estado que más atención pide. */
  estadoReembolso: EstadoReembolso;
  /** True si las salidas propias no están todas en el mismo estado. */
  reembolsoMixto: boolean;
  /** Lo que el jefe observó al rechazar: es lo que hay que subsanar. */
  observacionReembolso: string | null;
  revisorNotificadoAt: string | null;
  /** True con la primera revisión aprobada y el reembolso abierto (RG-35). */
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
  /** Rendidas que todavía no se enviaron a primera revisión. */
  porEnviar: number;
  /** Aprobadas en primera revisión y sin el Consolidado del S10 adjunto. */
  sinConsolidado: number;
  /** Con consolidado y reembolso abierto, pero sin avisarle todavía al revisor. */
  porAvisar: number;
  /** Observadas: la primera revisión o el reembolso volvieron con observaciones. */
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

/**
 * Destinatarios REALES de un correo del flujo, ya resueltos por el backend con la configuración
 * de Configuración → Correos. No es "tu jefe": el revisor puede estar apagado ahí y el correo
 * irse solo a los destinatarios configurados. `para` vacío = no le llega a nadie.
 */
export interface CorreoDestinatariosDto {
  para: string[];
  copia: string[];
}

/**
 * Datos de arranque de la pantalla: lo que NO cambia al mover los filtros. Por eso las opciones
 * del filtro de periodo viajan junto a los destinatarios de los correos que dispara la pantalla,
 * que son los mismos para toda ella (está acotada a un solo trabajador).
 */
export interface RendicionFilterDataDto {
  periodos: PeriodoOptionDto[];
  /** A quién le llega el aviso de la primera revisión. Lo dispara "Enviar a revisión". */
  correoPrimeraRevision: CorreoDestinatariosDto;
  /** A quién le llega el aviso del Consolidado del S10. Lo dispara "Avisar al revisor". */
  correoS10Revisor: CorreoDestinatariosDto;
}
