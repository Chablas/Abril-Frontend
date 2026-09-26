/** Normaliza texto libre para comparar respuestas de forma tolerante (trim, minúsculas,
 *  sin tildes, espacios múltiples colapsados) — usado por respuesta corta y completar
 *  huecos antes de decidir si coincide con la respuesta correcta o alguna variante. */
export function normalizarTexto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}
