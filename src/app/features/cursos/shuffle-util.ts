/** Fisher-Yates: baraja una copia del array, nunca muta el original — el original
 *  (config.opciones) debe conservar su orden porque `respuestaCorrecta` a veces se apoya
 *  en su posición/orden original (ver pregunta-config-builder.ts). Usado por
 *  "Mostrar orden aleatorio" en SlideOpcionMultiple/SlideEleccionMultiple. */
export function barajar<T>(items: T[]): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
