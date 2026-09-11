/**
 * Tipos del ciclo de la rendición que usan varias pantallas del módulo (Gestión de Rendiciones y
 * Reembolsos), así que viven en el shared del módulo y no dentro de una de ellas.
 */

/** Resultado de una acción en bloque sobre el reembolso (aprobar, observar, firmar, pagar). */
export interface ReembolsoBulkResultDto {
  procesadas: number;
  /** Cuántas planillas distintas se firmaron. Solo lo llena la acción de firmar. */
  planillasFirmadas: number;
  message: string;
}

/**
 * Estados del reembolso, tal como los nombra el backend. "Proceder con el reembolso" es el paso
 * de Tesorería entre la firma y el pago: la revisión documental ya está confirmada y el
 * desembolso queda habilitado (RG-26).
 */
export type EstadoReembolso =
  | 'Pendiente'
  | 'Aprobado'
  | 'Observado'
  | 'Firmado'
  | 'Proceder con el reembolso'
  | 'Pagado';

/**
 * Estados de la PRIMERA revisión de una planilla, tal como los nombra el backend. Es el paso
 * anterior al Consolidado del S10: el jefe revisa tramos, montos y capturas, y solo con su
 * aprobación el trabajador puede cargar el consolidado.
 */
export type EstadoPrimeraRevision =
  | 'Lista para enviar'
  | 'En primera revisión'
  | 'Aprobada'
  | 'Observada';

/**
 * Estados de una solicitud de corrección del Consolidado del S10 al Coordinador ERP. Describen
 * QUIÉN tiene que actuar, no qué pasó: es lo que la pantalla muestra tal cual.
 */
export type EstadoCorreccionS10 = 'Pendiente de corrección S10' | 'Pendiente de recarga S10';

/**
 * La solicitud de corrección viva de una planilla. La muestran las dos pantallas del paso: Mis
 * Rendiciones (el colaborador, para saber de quién es la pelota) y Correcciones S10 (el
 * Coordinador ERP, que la atiende), así que vive en el shared del módulo.
 */
export interface CorreccionS10Dto {
  id: number;
  rendicionId: number;
  estado: EstadoCorreccionS10;
  /** El «MOTIVO *» que escribió el colaborador: qué necesita del ERP. */
  motivo: string;
  /** Con qué se observó el reembolso, copiada al solicitar. */
  motivoJefatura: string | null;
  /**
   * Quién escribió esa observación: "Jefatura" o "Tesorería" (RG-49). Vacío en las correcciones
   * anteriores a la columna, que son todas de jefatura.
   */
  motivoOrigen: string;
  /** Guía del consolidado observado — con esto el ERP lo encuentra en el S10. */
  numeroGuia: string | null;
  solicitadaPor: string;
  solicitadaAt: string;
  /** Coordinador ERP que confirmó. Null mientras esté por atender. */
  atendidaPor: string | null;
  atendidaAt: string | null;
  comentarioAtencion: string | null;
  /** True si el ERP anuló el registro: hace falta una guía NUEVA (CA-19). */
  guiaAnulada: boolean;
  /** True mientras el ERP no la haya atendido: la pelota está en el Coordinador. */
  esperandoErp: boolean;
}

/**
 * Colores del badge de la corrección del S10. Ámbar mientras espera al ERP (no le toca nada al
 * colaborador) y azul cuando ya volvió a él: el azul es el mismo que usa "En primera revisión",
 * el color de "hay algo que hacer".
 */
export function correccionS10Colors(esperandoErp: boolean): { bg: string; text: string } {
  return esperandoErp
    ? { bg: '#FFEDD5', text: '#C2410C' }
    : { bg: '#DBEAFE', text: '#1D4ED8' };
}

export interface TrabajadorOptionDto {
  workerId: number;
  nombreCompleto: string;
}

/** Nodo del árbol area_scope; el frontend arma la jerarquía a partir de la lista plana. */
export interface AreaNodeDto {
  areaScopeId: number;
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaScopeParentId?: number | null;
  displayOrder: number;
}

/** Un periodo (mes) ofrecido por el filtro de las pantallas de planillas. */
export interface PeriodoOptionDto {
  anio: number;
  mes: number;
  /** "Agosto 2026" — ya viene capitalizado del backend. */
  label: string;
}

/**
 * Colores del badge de estado del reembolso. Están acá y no repetidos por pantalla porque el mismo
 * estado tiene que verse igual en las tres.
 */
export function reembolsoColors(estado: string): { bg: string; text: string } {
  switch (estado) {
    case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
    case 'Observado': return { bg: '#FAD5D4', text: '#D30000' };
    case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
    // Ya pasó por Tesorería pero todavía no se desembolsó: ámbar, no verde — sigue esperando.
    case 'Proceder con el reembolso': return { bg: '#FFEDD5', text: '#C2410C' };
    case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
    default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
  }
}

/**
 * Etiqueta corta del estado del reembolso para las tablas. Solo cambia "Proceder con el
 * reembolso", que es el nombre del requerimiento funcional y no entra en una celda; el resto se
 * muestra tal cual lo nombra el backend.
 */
export function reembolsoLabelCorto(estado: string): string {
  return estado === 'Proceder con el reembolso' ? 'Por pagar' : estado;
}

/**
 * Colores del badge de la primera revisión. "Lista para enviar" va en gris a propósito: no espera
 * a nadie más que al propio trabajador y no debe competir con los estados que sí piden atención.
 */
export function primeraRevisionColors(estado: string): { bg: string; text: string } {
  switch (estado) {
    case 'En primera revisión': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'Aprobada':            return { bg: '#D7FAF4', text: '#009C87' };
    case 'Observada':           return { bg: '#FAD5D4', text: '#D30000' };
    default:                    return { bg: '#F3F4F6', text: '#4B5563' }; // Lista para enviar
  }
}
