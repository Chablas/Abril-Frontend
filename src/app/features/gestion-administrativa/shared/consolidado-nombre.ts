/**
 * Cómo se nombra una rendición grupal (el Consolidado del S10) en las cuatro pantallas de su ciclo:
 * Gestión de Rendiciones, Consolidados, Correcciones S10 y Reembolsos. Vive en el shared del módulo
 * porque el mismo documento tiene que leerse igual en las cuatro — que en una se llame de una forma
 * y en otra de otra es justo lo que hacía difícil seguirlo.
 *
 * Son dos nombres y no uno: el código `CON-AAAA-NNNN` es el nuestro y sobrevive a reemplazar el
 * archivo, mientras que el N.° de reembolso es el que le puso el S10 y cambia cuando el ERP anula
 * el registro. Por eso se imprimen juntos donde hay sitio.
 */

/** Algo que se puede nombrar como consolidado: basta con sus dos identificadores. */
export interface ConsolidadoNombrable {
  codigo?: string | null;
  numeroReembolso?: string | null;
}

/**
 * Nombre completo: `CON-2026-0001 · N.° 12345`. Se cae con elegancia a lo que haya —los
 * consolidados viejos no tienen ninguno de los dos— y nunca devuelve vacío.
 */
export function nombreConsolidado(c: ConsolidadoNombrable | null | undefined): string {
  const partes: string[] = [];
  if (c?.codigo) partes.push(c.codigo);
  if (c?.numeroReembolso) partes.push('N.° ' + c.numeroReembolso);
  return partes.join(' · ') || 'Consolidado del S10';
}
