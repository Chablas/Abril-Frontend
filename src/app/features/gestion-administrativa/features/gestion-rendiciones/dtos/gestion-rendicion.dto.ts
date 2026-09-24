import {
  ConsolidadoS10Dto,
  ConsolidadoS10RendicionDto,
} from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { ReembolsoPipelineDto } from '../../../shared/dtos/reembolso-pipeline.dto';
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
  /**
   * La planilla grupal que preparó el consolidador y que todavía espera su Consolidado del S10.
   * Null si no se preparó y también cuando ya tiene consolidado: desde ahí la planilla grupal viaja
   * dentro de `consolidadoS10`, junto con su copia firmada.
   */
  planillaGrupal: PlanillaGrupalDto | null;

  // ── Primera revisión ───────────────────────────────────────────────────
  // El paso que va ANTES del Consolidado del S10: se miran trayectos, montos y capturas y se decide.
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
  /**
   * Quién la escribió: "Jefatura" o "Tesorería" (RG-49). Una planilla que devolvió Tesorería vuelve
   * acá para que la jefatura la firme de nuevo, así que el revisor tiene que ver que no es su
   * propia observación vieja.
   */
  observacionReembolsoOrigen: string;
  revisorNotificadoAt: string | null;

  // ── Qué se puede hacer con esta planilla ───────────────────────────────
  /**
   * True si al usuario le toca decidir la primera revisión de esta planilla: está entre sus
   * aprobadores (en obra, el administrador). False para cualquier otro que la vea, incluido quien
   * la ve porque incluye salidas suyas. Con false NO se muestran Aprobar/Observar: ni en la fila
   * ni en el pie del detalle.
   */
  puedeDecidir: boolean;
  /**
   * True si el usuario es consolidador de esta planilla y puede adjuntarle el Consolidado del S10.
   * Lo resuelve el backend con el mismo algoritmo que la pantalla de Consolidadores (Consolidados →
   * Configuración: lo asignado por área, o el Jefe/Gerente/residente que deduce), y hace falta poder
   * por TODOS los trabajadores de `consolidadoConjunto`: el consolidado cubre esos documentos
   * enteros.
   *
   * Ver la planilla no alcanza, y ser el dueño de las salidas tampoco: el trámite del S10 es solo
   * del consolidador.
   */
  puedeConsolidar: boolean;
  /**
   * True si a esta planilla se le puede preparar la planilla grupal: primera revisión aprobada, el
   * reembolso de todas sus salidas por decidir y todavía sin planilla grupal ni Consolidado del S10.
   * Una planilla grupal ya preparada no se rehace ni se reemplaza. No mira permisos: para eso está
   * `puedeConsolidar`.
   */
  puedePrepararPlanilla: boolean;
  /**
   * True si a esta planilla se le puede adjuntar su PRIMER Consolidado del S10: primera revisión
   * aprobada, el reembolso por decidir, sin consolidado y con la planilla grupal ya preparada —el
   * S10 se sube sobre ella—. Reemplazarlo es de Consolidados. No mira permisos: para eso está
   * `puedeConsolidar`.
   */
  puedeAdjuntarConsolidado: boolean;
  /**
   * Planillas que cubriría el consolidado adjuntado desde esta fila: ella primero y, si ya tiene
   * planilla grupal, las demás de esa planilla (el S10 se sube para toda la planilla grupal a la
   * vez), aunque la tabla no las muestre. Cada una con su monto completo.
   */
  consolidadoConjunto: ConsolidadoConjuntoItemDto[];
}

/**
 * La planilla grupal que preparó el consolidador: el papel sin firmar con el que registra las
 * planillas en el S10, y sobre el que después sube el consolidado. Las rendiciones que la comparten
 * reciben la misma.
 */
export interface PlanillaGrupalDto {
  id: number;
  /** `CONS-ÁREA-AAAA-NNN`: va impreso en la planilla y lo hereda el consolidado. */
  codigo: string;
  pdfUrl: string;
  pdfFilename: string;
  preparadaAt: string;
  /** Rendiciones que cubre, ordenadas por código. */
  rendiciones: ConsolidadoS10RendicionDto[];
}

/** Una planilla que cubriría un Consolidado del S10, con su monto completo. */
export interface ConsolidadoConjuntoItemDto {
  id: number;
  /** Código REN-AAAA-NNNN. */
  codigo: string;
  /** Monto de la planilla COMPLETA (todas sus salidas, de todos sus trabajadores). */
  montoTotalPlanilla: number;
}

/**
 * Una salida de la planilla, para que el revisor vea qué agrupa el documento que está revisando.
 * Es solo lectura: la primera revisión se decide por planilla entera (`puedeDecidir`), no salida
 * por salida, y el reembolso se decide en Consolidados sobre el documento del S10.
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

export interface GestionRendicionDetalleDto extends GestionRendicionListItemDto {
  salidas: GestionRendicionSalidaDto[];

  /**
   * El recorrido del reembolso de esta planilla, para el pipeline del modal de detalle. Lo arma el
   * backend y viaja acá dentro: no cuesta una petición aparte.
   */
  pipeline: ReembolsoPipelineDto;

  // Los destinatarios de los correos de las decisiones NO vienen acá: se piden aparte con
  // `correoPreview` al apretar el botón. Antes había un `correoReembolsoAprobado` que el backend
  // nunca llenaba, así que el modal decía siempre "nadie recibirá el aviso" aunque el correo
  // estuviera activo. Ver shared/correo-aviso.ts.
}

/**
 * Números de las tarjetas del encabezado, contados sobre el conjunto ya filtrado: los dos pasos que
 * esta pantalla resuelve. Decidir el reembolso es de Consolidados y se cuenta allá.
 */
export interface ResumenGestionRendicionesDto {
  /** Planillas esperando la PRIMERA revisión: el primer paso del revisor. */
  primeraRevision: number;
  /** Aprobadas en primera revisión y sin Consolidado del S10: la pelota está en el consolidador. */
  sinConsolidado: number;
}

export interface GestionRendicionListResultDto {
  data: GestionRendicionListItemDto[];
  resumen: ResumenGestionRendicionesDto;
}

export interface GestionRendicionFilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  areaTree: AreaNodeDto[];
  periodos: PeriodoOptionDto[];
  /**
   * Razón social del usuario: es bajo la que queda el Consolidado del S10 que suba (la del
   * consolidador, no la de los trabajadores). Null si no la tiene cargada.
   */
  razonSocialConsolidador: string | null;
}

/**
 * Cuerpo de la decisión de la PRIMERA revisión. Va por planilla y no por salida: lo que se revisa
 * es el documento entero y la decisión es total.
 */
export interface PrimeraRevisionAccionDto {
  rendicionIds: number[];
  /** Obligatoria al observar: es el comentario que el trabajador va a leer. */
  observacion?: string | null;
}


