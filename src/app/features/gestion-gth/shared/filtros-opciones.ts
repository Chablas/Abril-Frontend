/**
 * Opciones de los desplegables de filtro de las bandejas del módulo.
 *
 * Se arman con lo que YA está en la lista cargada y no con un catálogo del backend: la pantalla
 * trae sus filas en una sola petición (ver ARCHITECTURE.md) y volver a pedir los catálogos sería
 * una segunda llamada para mostrar opciones que en muchos casos no devolverían ninguna fila. Como
 * efecto secundario, el desplegable nunca ofrece un filtro que deje la tabla vacía.
 */

/** Una opción del desplegable: el valor con el que se filtra y lo que se lee. */
export interface OpcionFiltro {
  /** Valor que guarda el filtro. Nunca vacío: «todos» es `null` (ver `FiltroDesplegable.valor`). */
  value: string;
  label: string;
}

/**
 * Valores distintos de un campo de la lista, en orden alfabético y sin los vacíos. `value` y
 * `label` son el mismo texto: se filtra por lo que se lee, así que un dato que cambie de rótulo
 * (el estado de una vacante en aprobación se rotula según a quién se espera) se ofrece como las
 * opciones que realmente se ven en la columna.
 */
export function opcionesDe<T>(
  items: readonly T[],
  selector: (item: T) => string | null | undefined,
): OpcionFiltro[] {
  const vistos = new Set<string>();
  for (const item of items) {
    const valor = selector(item)?.trim();
    if (valor) vistos.add(valor);
  }
  return [...vistos]
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true }))
    .map((value) => ({ value, label: value }));
}

/**
 * Un desplegable del panel de filtros: el valor elegido más las opciones que le tocan. Las tres
 * bandejas del módulo tienen varios y todos se comportan igual, así que la regla de cuándo se
 * muestra y cuándo se descarta vive en un solo sitio.
 */
export class FiltroDesplegable {
  /**
   * Valor elegido. `null` = «todos», que es como arranca — y no `''`, que `app-search-select`
   * considera un valor de verdad: pintaría el placeholder con el color de una opción elegida y le
   * pondría al lado la equis de limpiar sin que hubiera nada que limpiar.
   */
  valor: string | null = null;

  opciones: OpcionFiltro[] = [];

  /**
   * Rearma las opciones con la lista recién cargada y descarta el valor elegido si ya no está
   * entre ellas (se anuló la última vacante de ese proyecto, el reemplazo pasó a la siguiente
   * fase) o si el desplegable dejó de mostrarse. Un filtro aplicado sin control a la vista con
   * el que quitarlo dejaría la tabla recortada sin explicación.
   */
  actualizar(opciones: OpcionFiltro[]): void {
    this.opciones = opciones;
    if (!this.visible || !opciones.some((o) => o.value === this.valor)) this.valor = null;
  }

  /**
   * ¿Se muestra? Solo si puede partir la lista: con una sola opción, elegirla no saca ninguna
   * fila y el combo es un control de adorno.
   */
  get visible(): boolean {
    return this.opciones.length > 1;
  }

  get activo(): boolean {
    return this.valor !== null;
  }

  limpiar(): void {
    this.valor = null;
  }

  /** ¿La fila pasa este filtro? Sin valor elegido pasan todas. */
  coincide(valorFila: string | null | undefined): boolean {
    return this.valor === null || valorFila === this.valor;
  }
}

/**
 * Cuántos de los desplegables dados están filtrando algo. Alimenta el contador del botón
 * «Filtros», al que cada pantalla le suma además su búsqueda de texto y sus filtros propios.
 */
export function contarFiltrosActivos(...filtros: readonly FiltroDesplegable[]): number {
  return filtros.filter((f) => f.activo).length;
}
