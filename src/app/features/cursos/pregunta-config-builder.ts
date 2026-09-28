import { ElementoLibre, ElementoPreguntaConfig } from './dtos/curso.dtos';

/** Construye el objeto "plano" que cada componente del reproductor (SlideVerdaderoFalso,
 *  SlideOpcionMultiple, etc.) espera parsear de su propio configuracionJson — MISMA lógica
 *  que curso-editor.ts usaba antes en su método privado construirConfiguracionPregunta,
 *  ahora compartida porque también la necesita slide-contenido-libre.ts para renderizar una
 *  pregunta insertada como elemento del lienzo libre. Devuelve un objeto (no un string), a
 *  diferencia del método original — cada llamador decide si lo guarda anidado (dentro de
 *  "elementos") o lo aplana al nivel raíz (para que CorregirGenerico en el backend lo vea).
 *
 *  `elemento` es opcional: solo lo tienen los llamadores que parten de una pregunta EMBEBIDA
 *  (un ElementoLibre completo, no solo su .pregunta) — se usa para los colores propios de
 *  "Emparejar conceptos" (emparejarColor*), que viven en ElementoLibre porque son de Diseño,
 *  no de Contenido. Una pregunta de pantalla completa (curso-editor.ts:663) no tiene
 *  elemento contenedor, así que esos colores quedan undefined ahí — no tiene pestaña Diseño
 *  con esos campos de todos modos. */
export function construirConfiguracionPlanaDesdePregunta(p: ElementoPreguntaConfig, elemento?: ElementoLibre): any {
  const base = { kicker: p.kicker || undefined };

  switch (p.tipoCodigo) {
    case 'pregunta_vf': {
      const correcta = p.opciones.find((o) => o.correcta);
      return {
        ...base,
        enunciado: p.enunciado,
        imagenUrl: p.imagenUrl || undefined,
        respuestaCorrecta: { valor: correcta?.id === 'true' },
      };
    }
    case 'pregunta_desliza_acierta':
      return {
        ...base,
        tarjetas: p.deslizaTarjetas.map((t) => ({ id: t.id, texto: t.texto, imagenUrl: t.imagenUrl || undefined })),
        respuestaCorrecta: { valores: p.deslizaTarjetas.map((t) => t.correcta) },
        umbralAprobarPct: p.deslizaUmbralAprobarPct ?? undefined,
        colorFondo: elemento?.deslizaColorFondo || undefined,
        fuente: elemento?.deslizaFuente || undefined,
        tamanoTexto: elemento?.deslizaTamanoTexto || undefined,
        colorTexto: elemento?.deslizaColorTexto || undefined,
        colorProgreso: elemento?.deslizaColorProgreso || undefined,
        colorDegradado: elemento?.deslizaColorDegradado || undefined,
        colorIconoFalso: elemento?.deslizaColorIconoFalso || undefined,
        colorFondoBotonFalso: elemento?.deslizaColorFondoBotonFalso || undefined,
        colorIconoVerdadero: elemento?.deslizaColorIconoVerdadero || undefined,
        colorFondoBotonVerdadero: elemento?.deslizaColorFondoBotonVerdadero || undefined,
        feedbackCorrectoColor: elemento?.deslizaFeedbackCorrectoColor || undefined,
        feedbackCorrectoTexto: elemento?.deslizaFeedbackCorrectoTexto || undefined,
        feedbackIncorrectoColor: elemento?.deslizaFeedbackIncorrectoColor || undefined,
        feedbackIncorrectoTexto: elemento?.deslizaFeedbackIncorrectoTexto || undefined,
        resultadoColorFondo: elemento?.deslizaResultadoColorFondo || undefined,
        resultadoFondoTarjeta: elemento?.deslizaResultadoFondoTarjeta || undefined,
        resultadoColorEtiquetas: elemento?.deslizaResultadoColorEtiquetas || undefined,
        resultadoColorValorCorrecto: elemento?.deslizaResultadoColorValorCorrecto || undefined,
        resultadoColorValorIncorrecto: elemento?.deslizaResultadoColorValorIncorrecto || undefined,
      };
    case 'pregunta_opcion_multiple': {
      const correcta = p.opciones.find((o) => o.correcta);
      return {
        ...base,
        enunciado: p.enunciado,
        opciones: p.opciones.map((o) => ({ id: o.id, texto: o.texto, imagenUrl: o.imagenUrl || undefined })),
        respuestaCorrecta: { opcionId: correcta?.id },
        ordenAleatorio: p.ordenAleatorio || undefined,
        botonEnviarActivo: p.botonEnviarActivo || undefined,
      };
    }
    case 'pregunta_eleccion_multiple':
      return {
        ...base,
        enunciado: p.enunciado,
        opciones: p.opciones.map((o) => ({ id: o.id, texto: o.texto, imagenUrl: o.imagenUrl || undefined })),
        respuestaCorrecta: { opcionIds: p.opciones.filter((o) => o.correcta).map((o) => o.id) },
        ordenAleatorio: p.ordenAleatorio || undefined,
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
        colorFondo: elemento?.emparejarColorFondo || undefined,
        colorSeleccion: elemento?.emparejarColorSeleccion || undefined,
        colorBordeCorrecto: elemento?.emparejarColorBordeCorrecto || undefined,
        colorBordeIncorrecto: elemento?.emparejarColorBordeIncorrecto || undefined,
        colorLinea: elemento?.emparejarColorLinea || undefined,
      };
    default:
      return {};
  }
}
