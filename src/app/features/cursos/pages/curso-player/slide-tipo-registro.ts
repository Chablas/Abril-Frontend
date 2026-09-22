// Registro central de tipos de slide/pregunta del reproductor de cursos.
//
// Sirve como fuente de verdad para:
//  - Validar si un `tipoCodigo` recibido del backend es soportado por esta versión del frontend.
//  - Mostrar una `etiqueta` legible en mensajes de error y, a futuro, en un editor de cursos.
//
// IMPORTANTE: el render de cada slide en `curso-player.html` sigue haciéndose con un `@switch`
// explícito (no con NgComponentOutlet) porque el manejo de un `@Output()` dinámico con
// NgComponentOutlet en Angular 21 requiere leer la instancia vía ViewChild/API interna, lo cual
// es frágil frente a la ganancia real (evitar 6 líneas de @case). Este registro no reemplaza el
// switch, lo complementa: cada entrada nueva aquí DEBE tener también su @case correspondiente en
// `curso-player.html`. Ver checklist completo en `../../AGREGAR-TIPO-DE-SLIDE.md`.

import { Type } from '@angular/core';

import { SlideContenido } from './slides/slide-contenido/slide-contenido';
import { SlideVerdaderoFalso } from './slides/slide-verdadero-falso/slide-verdadero-falso';
import { SlideOpcionMultiple } from './slides/slide-opcion-multiple/slide-opcion-multiple';
import { SlideMarcarImagen } from './slides/slide-marcar-imagen/slide-marcar-imagen';
import { SlideArrastrarSoltar } from './slides/slide-arrastrar-soltar/slide-arrastrar-soltar';
import { SlideOrdenar } from './slides/slide-ordenar/slide-ordenar';

export interface SlideTipoDef {
  tipoCodigo: string;
  component: Type<any>;
  etiqueta: string;
}

export const SLIDE_TIPOS: SlideTipoDef[] = [
  { tipoCodigo: 'contenido_texto', component: SlideContenido, etiqueta: 'Contenido' },
  { tipoCodigo: 'pregunta_vf', component: SlideVerdaderoFalso, etiqueta: 'Verdadero / Falso' },
  {
    tipoCodigo: 'pregunta_opcion_multiple',
    component: SlideOpcionMultiple,
    etiqueta: 'Opción múltiple',
  },
  { tipoCodigo: 'pregunta_imagen', component: SlideMarcarImagen, etiqueta: 'Marcar imagen' },
  {
    tipoCodigo: 'pregunta_arrastrar',
    component: SlideArrastrarSoltar,
    etiqueta: 'Arrastrar y soltar',
  },
  { tipoCodigo: 'pregunta_ordenar', component: SlideOrdenar, etiqueta: 'Ordenar' },
];

export function resolverComponenteSlide(tipoCodigo: string): Type<any> | null {
  return SLIDE_TIPOS.find((t) => t.tipoCodigo === tipoCodigo)?.component ?? null;
}

export function resolverEtiquetaSlide(tipoCodigo: string): string | null {
  return SLIDE_TIPOS.find((t) => t.tipoCodigo === tipoCodigo)?.etiqueta ?? null;
}

export function esTipoSlideSoportado(tipoCodigo: string): boolean {
  return SLIDE_TIPOS.some((t) => t.tipoCodigo === tipoCodigo);
}
