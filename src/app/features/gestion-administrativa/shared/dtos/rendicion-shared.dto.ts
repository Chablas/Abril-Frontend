/**
 * Tipos del ciclo de la rendición que usan varias pantallas del módulo (Gestión de Rendiciones y
 * Reembolsos), así que viven en el shared del módulo y no dentro de una de ellas.
 */

/** Resultado de una acción en bloque sobre el reembolso (aprobar, rechazar, firmar, pagar). */
export interface ReembolsoBulkResultDto {
  procesadas: number;
  /** Cuántas planillas distintas se firmaron. Solo lo llena la acción de firmar. */
  planillasFirmadas: number;
  message: string;
}

/** Estados del reembolso, tal como los nombra el backend. */
export type EstadoReembolso = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Firmado' | 'Pagado';

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
    case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
    case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
    case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
    default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
  }
}
