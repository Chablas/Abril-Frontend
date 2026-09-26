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
import { SlideTarjetas } from './slides/slide-tarjetas/slide-tarjetas';
import { SlideGaleriaZoom } from './slides/slide-galeria-zoom/slide-galeria-zoom';
import { SlideContenidoLibre } from './slides/slide-contenido-libre/slide-contenido-libre';
import { SlideRespuestaCorta } from './slides/slide-respuesta-corta/slide-respuesta-corta';
import { SlideCompletarHuecos } from './slides/slide-completar-huecos/slide-completar-huecos';
import { SlideEmparejarConceptos } from './slides/slide-emparejar-conceptos/slide-emparejar-conceptos';
import { SlideEleccionMultiple } from './slides/slide-eleccion-multiple/slide-eleccion-multiple';
import { SlideDeslizaAcierta } from './slides/slide-desliza-acierta/slide-desliza-acierta';

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
  { tipoCodigo: 'contenido_tarjetas', component: SlideTarjetas, etiqueta: 'Tarjetas' },
  { tipoCodigo: 'contenido_galeria_zoom', component: SlideGaleriaZoom, etiqueta: 'Galería con zoom' },
  { tipoCodigo: 'contenido_libre', component: SlideContenidoLibre, etiqueta: 'Lienzo libre' },
  {
    tipoCodigo: 'pregunta_respuesta_corta',
    component: SlideRespuestaCorta,
    etiqueta: 'Respuesta corta',
  },
  {
    tipoCodigo: 'pregunta_completar_huecos',
    component: SlideCompletarHuecos,
    etiqueta: 'Completar huecos',
  },
  {
    tipoCodigo: 'pregunta_emparejar',
    component: SlideEmparejarConceptos,
    etiqueta: 'Emparejar conceptos',
  },
  {
    tipoCodigo: 'pregunta_eleccion_multiple',
    component: SlideEleccionMultiple,
    etiqueta: 'Elección múltiple',
  },
  {
    tipoCodigo: 'pregunta_desliza_acierta',
    component: SlideDeslizaAcierta,
    etiqueta: 'Desliza y acierta',
  },
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
