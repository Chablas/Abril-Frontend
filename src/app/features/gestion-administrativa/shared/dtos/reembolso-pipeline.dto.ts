/**
 * El seguimiento del reembolso en forma de fases: lo que pinta el pipeline horizontal del modal de
 * detalle. Lo arma el backend (`ReembolsoPipelineBuilder`) y viaja dentro del detalle que la
 * pantalla ya pide, así que no cuesta una petición aparte.
 *
 * Es el MISMO recorrido en las cinco pantallas —de la solicitud al pago—; lo que cambia es el ítem
 * que se está mirando (`itemTipo`): una salida suelta en Solicitud de Salidas y Gestión de Salidas,
 * una planilla en Mis Rendiciones y Gestión de Rendiciones, y una rendición grupal en Consolidados.
 */

/**
 * En qué anda una fase.
 *
 * `observado` es la fase que devolvió algo (la primera revisión, la jefatura o Tesorería): el
 * recorrido no retrocede —eso escondería todo lo que ya se cumplió después—, la fase se pinta en
 * rojo y el resumen dice qué hay que subsanar. `cancelado` es el final feo de la salida (rechazada
 * o cancelada), donde el recorrido no sigue.
 */
export type EstadoPasoReembolso =
  | 'completado'
  | 'actual'
  | 'pendiente'
  | 'observado'
  | 'cancelado';

export interface ReembolsoPipelinePasoDto {
  /** Identificador estable de la fase (SOLICITUD, APROBACION, …). No se muestra. */
  clave: string;
  /** Lo que se lee debajo del círculo. */
  titulo: string;
  /** Qué pasa en esta fase y quién la resuelve. Va en el tooltip. */
  descripcion: string;
  estado: EstadoPasoReembolso;
  /** Cuándo se cumplió (o desde cuándo espera). Null si no aplica. */
  fecha: string | null;
}

export interface ReembolsoPipelineDto {
  /** "Salida" | "Rendición" | "Consolidado" — de qué se está siguiendo el reembolso. */
  itemTipo: string;
  /** Código del ítem (SOL-…, REN-…, CONS-…). Null en los registros sin código. */
  itemCodigo: string | null;
  /** Fase en la que está parado (1-based). Con todo cumplido es la última. */
  pasoActual: number;
  totalPasos: number;
  /** Estado de la fase actual, para pintar el resumen sin indexar la lista. */
  estadoActual: EstadoPasoReembolso;
  /**
   * Titular de en qué anda ("En primera revisión"). Es lo único que se lee de corrido: lo que haya
   * que ampliar —la observación, el motivo del rechazo, las firmas que faltan— ya lo muestra el
   * modal en su propio bloque.
   */
  resumen: string;
  /**
   * Aviso extra debajo del pipeline: que la salida no genera reembolso, o que lo que agrupa no
   * está todo en el mismo punto. Null en el caso normal.
   */
  nota: string | null;
  pasos: ReembolsoPipelinePasoDto[];
}

/**
 * Los colores de cada estado de fase, en un solo lugar: el círculo, su etiqueta y el recuadro del
 * resumen tienen que hablar del mismo color, y son los mismos que usan los badges del módulo
 * (`rendicion-shared.dto.ts`) para que "en revisión" no sea azul acá y de otro color allá.
 */
export function pasoReembolsoColors(estado: EstadoPasoReembolso): {
  borde: string;
  fondo: string;
  texto: string;
} {
  switch (estado) {
    // Cumplido: el verde de la marca, relleno — es el camino ya recorrido.
    case 'completado': return { borde: '#0F6E56', fondo: '#0F6E56', texto: '#FFFFFF' };
    // En curso: el mismo azul de "En primera revisión", el color de "hay algo que hacer".
    case 'actual':     return { borde: '#1D4ED8', fondo: '#DBEAFE', texto: '#1D4ED8' };
    case 'observado':  return { borde: '#D30000', fondo: '#FEE2E2', texto: '#D30000' };
    case 'cancelado':  return { borde: '#9CA3AF', fondo: '#F3F4F6', texto: '#4B5563' };
    default:           return { borde: '#D1D5DB', fondo: '#FFFFFF', texto: '#9CA3AF' };
  }
}
