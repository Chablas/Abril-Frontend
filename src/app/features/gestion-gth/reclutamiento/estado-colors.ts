/**
 * Colores del badge de estado del pipeline de reclutamiento (una entrada por fase).
 * Compartido entre la bandeja y el modal de detalle para que el mismo estado se
 * pinte igual en toda la feature.
 */
/**
 * Orden del pipeline de reclutamiento (espejo de gth_estado_requerimiento.orden).
 * Permite saber en el frontend si un requerimiento ya alcanzó una fase sin traer
 * el orden numérico del backend.
 */
const PIPELINE: string[] = [
  'NUEVO',
  'APROBACION_GG',
  'VALIDACION_GTH',
  'PUBLICACION',
  'LONG_LIST',
  'LONG_LIST_ENVIADA',
  'LONG_LIST_APROBADA',
  'SELECCION_JEFATURA',
  'EVALUACION',
  'ENTREVISTAS',
  'OFERTA_CIERRE',
];

/** true si el estado actual ya alcanzó (o superó) la fase indicada del pipeline. */
export function faseAlcanzada(estadoCodigo: string, fase: string): boolean {
  const actual = PIPELINE.indexOf(estadoCodigo);
  const objetivo = PIPELINE.indexOf(fase);
  return actual >= 0 && objetivo >= 0 && actual >= objetivo;
}

export function estadoColors(codigo: string): { bg: string; text: string } {
  switch (codigo) {
    case 'NUEVO':              return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'APROBACION_GG':      return { bg: '#FEF3C7', text: '#B45309' };
    case 'VALIDACION_GTH':     return { bg: '#E0E7FF', text: '#4338CA' };
    case 'PUBLICACION':        return { bg: '#CCFBF1', text: '#0F766E' };
    case 'LONG_LIST':          return { bg: '#F3E8FF', text: '#7E22CE' };
    case 'LONG_LIST_ENVIADA':  return { bg: '#E0F2FE', text: '#0284C7' };
    case 'LONG_LIST_APROBADA': return { bg: '#DCFCE7', text: '#15803D' };
    case 'SELECCION_JEFATURA': return { bg: '#CFFAFE', text: '#0E7490' };
    case 'EVALUACION':         return { bg: '#FFEDD5', text: '#C2410C' };
    case 'ENTREVISTAS':        return { bg: '#FCE7F3', text: '#BE185D' };
    case 'OFERTA_CIERRE':      return { bg: '#DCFCE7', text: '#15803D' };
    default:                   return { bg: '#F3F4F6', text: '#374151' };
  }
}
