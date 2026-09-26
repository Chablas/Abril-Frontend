import { ElementoPreguntaConfig } from './dtos/curso.dtos';

/** Construye el objeto "plano" que cada componente del reproductor (SlideVerdaderoFalso,
 *  SlideOpcionMultiple, etc.) espera parsear de su propio configuracionJson — MISMA lógica
 *  que curso-editor.ts usaba antes en su método privado construirConfiguracionPregunta,
 *  ahora compartida porque también la necesita slide-contenido-libre.ts para renderizar una
 *  pregunta insertada como elemento del lienzo libre. Devuelve un objeto (no un string), a
 *  diferencia del método original — cada llamador decide si lo guarda anidado (dentro de
 *  "elementos") o lo aplana al nivel raíz (para que CorregirGenerico en el backend lo vea). */
export function construirConfiguracionPlanaDesdePregunta(p: ElementoPreguntaConfig): any {
  const base = { kicker: p.kicker || undefined };

  switch (p.tipoCodigo) {
    case 'pregunta_vf':
    case 'pregunta_desliza_acierta': {
      const correcta = p.opciones.find((o) => o.correcta);
      return {
        ...base,
        enunciado: p.enunciado,
        imagenUrl: p.imagenUrl || undefined,
        respuestaCorrecta: { valor: correcta?.id === 'true' },
      };
    }
    case 'pregunta_opcion_multiple': {
      const correcta = p.opciones.find((o) => o.correcta);
      return {
        ...base,
        enunciado: p.enunciado,
        opciones: p.opciones.map((o) => ({ id: o.id, texto: o.texto, imagenUrl: o.imagenUrl || undefined })),
        respuestaCorrecta: { opcionId: correcta?.id },
      };
    }
    case 'pregunta_eleccion_multiple':
      return {
        ...base,
        enunciado: p.enunciado,
        opciones: p.opciones.map((o) => ({ id: o.id, texto: o.texto, imagenUrl: o.imagenUrl || undefined })),
        respuestaCorrecta: { opcionIds: p.opciones.filter((o) => o.correcta).map((o) => o.id) },
      };
    case 'pregunta_ordenar':
      return {
        ...base,
        enunciado: p.enunciado,
        items: p.items,
        respuestaCorrecta: { ordenIds: p.items.map((i) => i.id) },
      };
    case 'pregunta_respuesta_corta':
      return {
        ...base,
        enunciado: p.enunciado,
        respuestaCorrecta: { texto: p.respuestaTexto },
        variantesAceptadas: p.variantes
          ? p.variantes.split(',').map((v) => v.trim()).filter(Boolean)
          : undefined,
      };
    case 'pregunta_completar_huecos':
      return {
        ...base,
        texto: p.textoHuecos,
        respuestaCorrecta: { textos: p.respuestasHuecos },
      };
    case 'pregunta_emparejar':
      return {
        ...base,
        enunciado: p.enunciado,
        izquierda: p.izquierda,
        derecha: p.derecha,
        respuestaCorrecta: p.parejas,
      };
    default:
      return {};
  }
}
