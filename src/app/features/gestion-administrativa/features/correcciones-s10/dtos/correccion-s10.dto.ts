import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import {
  EstadoCorreccionS10,
  EstadoReembolso,
  TrabajadorOptionDto,
} from '../../../shared/dtos/rendicion-shared.dto';

export type { EstadoCorreccionS10, EstadoReembolso, TrabajadorOptionDto };

/**
 * Una solicitud de corrección en la bandeja del Coordinador ERP. Trae todo lo que necesita para
 * hacer su trabajo sin abrir nada más: el número de reembolso con el que ubica el registro en el S10, qué observó
 * la jefatura y qué le pide el consolidador.
 *
 * La fila no trae las salidas: las trae el detalle (`CorreccionS10DetalleDto`), con el ojo de cada
 * una para ver sus trayectos. Sí trae los documentos por si necesita contrastarlos.
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

  /** El «MOTIVO *» del consolidador: la corrección que necesita. */
  motivo: string;
  /** Con qué se observó el reembolso, copiada al solicitar. */
  motivoJefatura: string | null;
  /**
   * Quién escribió esa observación: "Jefatura" o "Tesorería" (RG-49). Vacío en las correcciones
   * anteriores a la columna, que son todas de jefatura.
   */
  motivoOrigen: string;
  /** Número de reembolso del consolidado observado. Es EL dato con el que el ERP lo ubica en el S10. */
  numeroReembolso: string | null;

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
}

/**
 * El detalle de una corrección: la fila más las rendiciones que cubre el consolidado observado
 * —todas: el registro del S10 que se corrige es uno solo— con sus salidas, cuyo ojo abre los
 * trayectos.
 */
export interface CorreccionS10DetalleDto extends CorreccionS10ListItemDto {
  rendiciones: CorreccionS10PlanillaDto[];
  salidas: CorreccionS10SalidaDto[];
}

export interface CorreccionS10PlanillaDto {
  id: number;
  /** Código REN-AAAA-NNNN. */
  codigo: string;
  numeroPlanilla: string | null;
  estadoReembolso: EstadoReembolso;
  /** Monto de la planilla completa: lo que suma contra el importe del S10. */
  montoTotalPlanilla: number;
}

export interface CorreccionS10SalidaDto {
  id: number;
  codigo: string | null;
  /** Planilla a la que pertenece: es como se agrupan las salidas en el detalle. */
  rendicionId: number;
  trabajador: string;
  area: string | null;
  fechaSalida: string;
  motivo: string;
  trayectosCount: number;
  monto: number;
  estadoReembolso: EstadoReembolso;
}

/**
 * Las dos tarjetas del encabezado, contadas sobre el conjunto ya filtrado: los dos lados del paso
 * — lo que espera al ERP y lo que ya devolvió al consolidador.
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
 * El check de confirmación del Coordinador ERP (RG-22). El comentario es opcional: el requerimiento
 * solo exige el check, y lo que sigue siempre es lo mismo —el consolidador recarga el Consolidado
 * del S10 corregido—, así que no hay nada más que preguntar.
 */
export interface AtenderCorreccionS10Dto {
  correccionIds: number[];
  comentarioAtencion?: string | null;
}

export interface CorreccionS10BulkResultDto {
  procesadas: number;
  message: string;
}
