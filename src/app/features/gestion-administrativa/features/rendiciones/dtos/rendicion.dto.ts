import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { ReembolsoPipelineDto } from '../../../shared/dtos/reembolso-pipeline.dto';
import { CorreoAvisoDto } from '../../../shared/correo-aviso';
import {
  EstadoPrimeraRevision,
  EstadoReembolso,
} from '../../../shared/dtos/rendicion-shared.dto';

// Los dos ejes de estado de una planilla salen del shared del módulo: son los mismos que muestran
// Gestión de Rendiciones y Reembolsos, y repetir la unión acá la dejaba desactualizada.
export type { EstadoPrimeraRevision, EstadoReembolso };

/**
 * Una planilla de rendición del trabajador: un PDF que agrupa N salidas y equivale a un registro
 * en el S10. Es la unidad de esta pantalla.
 *
 * Al trabajador le toca enviarla a la primera revisión y subsanarla si vuelve observada. Lo que
 * sigue —el Consolidado del S10, el aviso a la jefatura y la corrección con el ERP— es del
 * consolidador de su área: acá solo se sigue.
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
   * Monto de la planilla COMPLETA (todas sus salidas, de todos sus trabajadores): el importe que se
   * registra en el S10. Coincide con `montoTotal` salvo en las planillas que agrupan a varios.
   */
  montoTotalPlanilla: number;

  // ── Documentos de la planilla ──────────────────────────────────────────
  pdfUrl: string;
  pdfFilename: string;
  /** Copia firmada por la jefatura. Null mientras nadie la firme. */
  pdfFirmadoUrl: string | null;
  pdfFirmadoFilename: string | null;
  firmadoAt: string | null;
  /** Consolidado del S10 vigente de la planilla (lo adjunta el consolidador). Null si todavía no está. */
  consolidadoS10: ConsolidadoS10Dto | null;

  // ── Primera revisión ───────────────────────────────────────────────────
  // El paso que va ANTES del Consolidado del S10: el jefe revisa trayectos, montos y capturas.
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
  /** Lo que se escribió al observar el reembolso. Lo subsana el consolidador. */
  observacionReembolso: string | null;
  /**
   * Quién la escribió: "Jefatura" o "Tesorería" (RG-49). Vacío si no hay observación. Importa
   * decirlo: quien ya vio su planilla firmada va a preguntarle a su jefe si no se nombra a
   * Tesorería.
   */
  observacionReembolsoOrigen: string;
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

  /**
   * El recorrido del reembolso de esta planilla, para el pipeline del modal de detalle. Lo arma el
   * backend y viaja acá dentro: no cuesta una petición aparte.
   */
  pipeline: ReembolsoPipelineDto;
}

/**
 * Números de las tarjetas del encabezado. Se cuentan sobre el MISMO conjunto que muestra la tabla
 * (con los filtros ya aplicados), así que acompañan a la búsqueda: por eso viajan con el listado y
 * no con los datos de los filtros. Son las dos cosas que le pueden faltar al trabajador.
 */
export interface ResumenRendicionesDto {
  /** Rendidas que todavía no se enviaron a primera revisión. */
  porEnviar: number;
  /**
   * Observadas en la primera revisión: hay que corregir capturas y montos y volver a generarlas.
   * Un reembolso observado no cuenta: lo subsana el consolidador.
   */
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
 * Datos de arranque de la pantalla: lo que NO cambia al mover los filtros. Por eso las opciones
 * del filtro de periodo viajan junto a los destinatarios de los correos que dispara la pantalla,
 * que son los mismos para toda ella (está acotada a un solo trabajador).
 */
export interface RendicionFilterDataDto {
  periodos: PeriodoOptionDto[];
  /**
   * A quién le llegan los dos correos de "Enviar a revisión" (el aviso a la jefatura y el acuse al
   * trabajador), ya resueltos por el backend con Configuración → Correos. Vacío = no sale ninguno.
   * Son los mismos que anuncia «Rendir» en Solicitud de Salidas.
   */
  correosEnvioRevision: CorreoAvisoDto[];
}
