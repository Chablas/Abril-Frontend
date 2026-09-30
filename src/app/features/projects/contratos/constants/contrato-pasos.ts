/** Feature keys del backend (ContratosFeatures.cs). */
export const CONTRATOS_FEATURE_VER = 'unidad-de-proyectos.contratos';
export const CONTRATOS_FEATURE_EDITAR = 'unidad-de-proyectos.contratos.editar';

/**
 * Los 9 estados del contrato (projectContractStatusId 1-9), en orden. Es un catálogo fijo del
 * backend (ProjectContractStatus); se replica acá para armar el stepper sin pedirlo aparte.
 */
export const CONTRATO_PASOS: readonly string[] = [
  'Cotización / cuadro comparativo',
  'Datos del contrato',
  'Generación de documentos',
  'Envío al contratista',
  'Llegada a Oficina Central',
  'Procesos de firma',
  'Contrato firmado escaneado',
  'Notificación a Unidad de Proyectos',
  'Cierre',
];

export const TOTAL_PASOS = CONTRATO_PASOS.length;

/** Paso 7 (escaneo del contrato firmado): todavía sin endpoint en el backend. */
export const PASO_SIN_IMPLEMENTAR = 7;

/**
 * Hasta qué estado se pueden editar los datos del contrato, sus hitos de pago y regenerar el
 * documento: antes de que empiecen las firmas (paso 6). Incluye el paso 5 porque es ahí donde el
 * expediente puede llegar con observaciones que obligan a corregir y regenerar. El backend no
 * valida el estado en estos endpoints — esta regla es solo de la pantalla.
 */
export const ULTIMO_ESTADO_EDITABLE = 5;

export interface EstadoBadge {
  bg: string;
  text: string;
}

/** Colores de badge por estado (DESIGN-VICTOR.md §6.3): pendiente / en proceso / culminado. */
export function estadoBadge(statusId: number): EstadoBadge {
  if (statusId >= TOTAL_PASOS) return { bg: '#dcfce7', text: '#166534' };
  if (statusId >= 4) return { bg: '#dbeafe', text: '#1e40af' };
  return { bg: '#f1f5f9', text: '#64748B' };
}

export function nombrePaso(statusId: number): string {
  return CONTRATO_PASOS[statusId - 1] ?? '—';
}
