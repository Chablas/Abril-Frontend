import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import {
  EstadoCorreccionS10,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type { EstadoCorreccionS10, TrabajadorOptionDto };

/**
 * Una solicitud de corrección en la bandeja del Coordinador ERP. Trae todo lo que necesita para
 * hacer su trabajo sin abrir nada más: la guía con la que ubica el registro en el S10, qué observó
 * la jefatura y qué le pide el colaborador.
 *
 * No trae los tramos ni las capturas: el ERP no revisa el gasto —eso ya lo hizo la jefatura—, solo
 * corrige el documento del S10. Sí trae los dos PDF por si necesita contrastarlos.
 */
export interface CorreccionS10ListItemDto {
  id: number;
  rendicionId: number;
  /** Código REN-AAAA-NNNN: es como el colaborador nombra su rendición. */
  codigo: string;
  numeroPlanilla: string | null;

  estado: EstadoCorreccionS10;
  /** True mientras el ERP no la haya atendido: es lo que le queda por hacer. */
  porAtender: boolean;

  trabajador: string;
  area: string | null;
  solicitadaPor: string;
  solicitadaAt: string;

  /** El «MOTIVO *» del colaborador: la corrección que necesita. */
  motivo: string;
  /** Con qué se observó el reembolso, copiada al solicitar. */
  motivoJefatura: string | null;
  /**
   * Quién escribió esa observación: "Jefatura" o "Tesorería" (RG-49). Vacío en las correcciones
   * anteriores a la columna, que son todas de jefatura.
   */
  motivoOrigen: string;
  /** Guía del consolidado observado. Es EL dato con el que el ERP lo ubica en el S10. */
  numeroGuia: string | null;

  periodo: string;
  periodoAnio: number;
  periodoMes: number;
  /** Monto de la planilla completa — el importe que debería tener el registro del S10. */
  montoTotalPlanilla: number;

  // ── Documentos, para contrastar ────────────────────────────────────────
  pdfUrl: string;
  pdfFilename: string;
  /** El Consolidado del S10 OBSERVADO: el archivo exacto que la jefatura miró. */
  consolidadoS10: ConsolidadoS10Dto | null;

  // ── Atención ───────────────────────────────────────────────────────────
  atendidaPor: string | null;
  atendidaAt: string | null;
  comentarioAtencion: string | null;
  /** True si el ERP anuló el registro y hace falta una guía nueva. */
  guiaAnulada: boolean;
}

/**
 * Las dos tarjetas del encabezado, contadas sobre el conjunto ya filtrado: los dos lados del paso
 * — lo que espera al ERP y lo que ya devolvió al colaborador.
 */
export interface ResumenCorreccionesS10Dto {
  porAtender: number;
  porRecargar: number;
}

export interface CorreccionS10ListResultDto {
  data: CorreccionS10ListItemDto[];
  resumen: ResumenCorreccionesS10Dto;
}

/** Un periodo (mes) ofrecido por el filtro. */
export interface PeriodoCorreccionOptionDto {
  anio: number;
  mes: number;
  /** "Agosto 2026" — ya viene capitalizado del backend. */
  label: string;
}

export interface CorreccionS10FilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  periodos: PeriodoCorreccionOptionDto[];
}

/**
 * El check de confirmación del Coordinador ERP. El comentario es opcional —el requerimiento solo
 * exige el check—, pero `guiaAnulada` cambia lo que el colaborador tiene que hacer después, así
 * que se pregunta explícitamente.
 */
export interface AtenderCorreccionS10Dto {
  correccionIds: number[];
  comentarioAtencion?: string | null;
  /**
   * true = el registro del S10 se ANULÓ y el colaborador tiene que sacar una guía nueva; la
   * anterior queda bloqueada. false = se corrigió conservando la guía.
   */
  guiaAnulada: boolean;
}

export interface CorreccionS10BulkResultDto {
  procesadas: number;
  message: string;
}
