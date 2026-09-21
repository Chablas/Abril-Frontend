/**
 * Tipo de requerimiento de una vacante (Nuevo / Reemplazo) y cómo se pinta.
 *
 * Vive en el `shared/` del módulo porque las tres pantallas del flujo lo muestran en su columna
 * «Tipo» y tienen que pintarlo igual: «Solicitud de Personal» (lo que pidió el área),
 * «Reclutamiento» (la bandeja de GTH) y «Aprobaciones» (la bandeja de los gerentes).
 */
import { OpcionFiltro } from './filtros-opciones';

/**
 * Código del tipo de requerimiento que obliga a decir a quién se reemplaza. Es también el que
 * NO pide sueldo: el puesto que se cubre ya existe con su banda, así que el formulario no lo
 * muestra y el backend descarta lo que llegue.
 */
export const TIPO_REQUERIMIENTO_REEMPLAZO = 'REEMPLAZO';

/** Código del tipo de las vacantes que crean plaza. */
export const TIPO_REQUERIMIENTO_NUEVO = 'NUEVO';

/**
 * Valor con el que el filtro «Tipo» representa un ingreso directo FFT. No es un tipo del catálogo
 * —el FFT es una columna aparte (`es_fft`) y se cruza con cualquiera de los dos tipos—, pero la
 * columna los muestra juntos, así que el desplegable ofrece las tres opciones que se leen ahí.
 *
 * Lleva guiones bajos para que no pueda chocar con el código de un tipo que se agregue al
 * catálogo: el valor nunca se ve (en el desplegable se lee su etiqueta), solo se compara.
 */
export const TIPO_FILTRO_FFT = '__FFT__';

/**
 * Cómo se pinta el tipo de requerimiento en la tabla y en el seguimiento: etiqueta con ícono y
 * borde, no un badge relleno, para que no se confunda con el estado, que va en badge al lado. Se
 * decide por el código —el nombre es presentación y se renombra desde Configuración— y cualquier
 * código que no sea REEMPLAZO se pinta como una vacante nueva.
 */
export interface TipoRequerimientoEstilo {
  color: string;
  borde: string;
  /** Clase del ícono de Tabler. */
  icono: string;
}

export function tipoRequerimientoEstilo(codigo: string | null | undefined): TipoRequerimientoEstilo {
  return codigo?.trim().toUpperCase() === TIPO_REQUERIMIENTO_REEMPLAZO
    ? { color: 'var(--color-abril-logo-blue)', borde: '#a9c9e6', icono: 'ti-arrows-exchange' }
    : {
        color: 'var(--color-abril-standard)',
        borde: 'var(--color-abril-standard-border)',
        icono: 'ti-circle-plus',
      };
}

/**
 * ¿La fila entra en la opción elegida del filtro «Tipo»? Sin opción elegida pasa todo.
 *
 * El ingreso directo NO excluye al tipo: la columna pinta las dos cosas juntas (el badge dice
 * «Nuevo» y debajo «FFT · Ingreso directo»), así que una vacante FFT nueva sale tanto con «Nuevo»
 * como con «Ingreso directo (FFT)» — se filtra por lo que se ve.
 */
export function coincideTipo(
  filtro: string | null,
  tipoCodigos: readonly (string | null | undefined)[],
  esFft: boolean,
): boolean {
  if (filtro === null) return true;
  if (filtro === TIPO_FILTRO_FFT) return esFft;
  return tipoCodigos.some((c) => c?.trim().toUpperCase() === filtro);
}

/** Una vacante, reducida a lo que el filtro «Tipo» necesita saber de ella. */
export interface TipoDeVacante {
  codigo: string | null | undefined;
  nombre: string | null | undefined;
  esFft: boolean;
}

/**
 * Opciones del desplegable «Tipo» según lo que hay en la lista: los tipos presentes, en el orden
 * del catálogo (Nuevo → Reemplazo → cualquier otro que se agregue), y el ingreso directo al final
 * solo si alguna vacante lo es.
 *
 * El `value` es el CÓDIGO y no el nombre porque el nombre se renombra desde Configuración; el
 * label es el nombre, que es lo que se lee en la columna.
 */
export function opcionesTipo(vacantes: readonly TipoDeVacante[]): OpcionFiltro[] {
  const orden = [TIPO_REQUERIMIENTO_NUEVO, TIPO_REQUERIMIENTO_REEMPLAZO];
  const porCodigo = new Map<string, string>();

  for (const v of vacantes) {
    const codigo = v.codigo?.trim().toUpperCase();
    if (codigo && !porCodigo.has(codigo)) porCodigo.set(codigo, v.nombre?.trim() || codigo);
  }

  const tipos = [...porCodigo]
    .sort(([a], [b]) => {
      const ia = orden.indexOf(a);
      const ib = orden.indexOf(b);
      // Los códigos que no están en el orden fijo van después, entre ellos por nombre.
      return (ia < 0 ? orden.length : ia) - (ib < 0 ? orden.length : ib) || a.localeCompare(b, 'es');
    })
    .map(([value, label]) => ({ value, label }));

  return vacantes.some((v) => v.esFft)
    ? [...tipos, { value: TIPO_FILTRO_FFT, label: 'Ingreso directo (FFT)' }]
    : tipos;
}
