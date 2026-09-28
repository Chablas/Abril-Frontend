// Plantillas de CURSO COMPLETO (no de una sola pantalla, ver plantillas-libre.ts) — estilo
// Genially "Empezar desde una plantilla": un clic crea el curso Y todas sus pantallas de
// una vez (portada, contenido, quiz), listo para que el autor solo reemplace textos/
// imágenes/logo. Contenido 100% original (no se copió el texto de ninguna plantilla de
// terceros); las imágenes quedan como placeholder (`imagenUrl: ''`) porque no tenemos
// derechos sobre fotos de stock — el autor las sube desde el panel, igual que ya funciona
// con plantillas-libre.ts.
import { ContenidoLibreConfig, CursoSlideUpsertDto, ElementoLibre } from '../../dtos/curso.dtos';
import { boton, forma, imagen, texto } from './plantillas-libre';

function icono(base: Partial<ElementoLibre> & Pick<ElementoLibre, 'x' | 'y' | 'ancho' | 'alto' | 'iconoClase'>): ElementoLibre {
  return {
    id: `tpl${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tipo: 'icono',
    rotacion: 0,
    zIndex: 1,
    animacionEntrada: 'fade',
    animacionDelayMs: 0,
    animacionDuracionMs: 600,
    animacionEasing: 'ease',
    colorTexto: '#14100b',
    ...base,
  };
}

function carrusel(base: Partial<ElementoLibre> & Pick<ElementoLibre, 'x' | 'y' | 'ancho' | 'alto'>): ElementoLibre {
  return {
    id: `tpl${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tipo: 'carrusel',
    rotacion: 0,
    zIndex: 1,
    animacionEntrada: 'fade',
    animacionDelayMs: 0,
    animacionDuracionMs: 600,
    animacionEasing: 'ease',
    carruselVisibles: 3,
    bordeRedondeado: 8,
    ...base,
  };
}

function hotspot(base: Partial<ElementoLibre> & Pick<ElementoLibre, 'x' | 'y' | 'ancho' | 'alto' | 'hotspotTexto'>): ElementoLibre {
  return {
    id: `tpl${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tipo: 'hotspot',
    rotacion: 0,
    zIndex: 2,
    animacionEntrada: 'fade',
    animacionDelayMs: 0,
    animacionDuracionMs: 600,
    animacionEasing: 'ease',
    hotspotColor: '#f5a623',
    ...base,
  };
}

export interface PlantillaCurso {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  tituloSugerido: string;
  categoriaSugerida: string;
  /** Sin `orden` — lo asigna quien instancia la plantilla (1..N en el orden del array). */
  generarSlides: () => Omit<CursoSlideUpsertDto, 'orden'>[];
}

function slideContenidoLibre(elementos: ElementoLibre[]): Omit<CursoSlideUpsertDto, 'orden'> {
  const config: ContenidoLibreConfig = { elementos };
  return {
    tipoCodigo: 'contenido_libre',
    esEvaluable: false,
    configuracionJson: JSON.stringify(config),
  };
}

function slideOpcionMultiple(
  enunciado: string,
  opciones: { texto: string; correcta?: boolean }[],
  puntaje = 10,
): Omit<CursoSlideUpsertDto, 'orden'> {
  const conId = opciones.map((o, i) => ({ id: String.fromCharCode(97 + i), texto: o.texto, correcta: o.correcta }));
  const correcta = conId.find((o) => o.correcta);
  return {
    tipoCodigo: 'pregunta_opcion_multiple',
    esEvaluable: true,
    puntaje,
    contarParaNota: true,
    modoCorreccion: 'igualdad_exacta',
    configuracionJson: JSON.stringify({
      enunciado,
      opciones: conId.map((o) => ({ id: o.id, texto: o.texto })),
      respuestaCorrecta: { opcionId: correcta?.id },
    }),
  };
}

function slideEleccionMultiple(
  enunciado: string,
  opciones: { texto: string; correcta?: boolean }[],
  puntaje = 10,
): Omit<CursoSlideUpsertDto, 'orden'> {
  const conId = opciones.map((o, i) => ({ id: String.fromCharCode(97 + i), texto: o.texto, correcta: o.correcta }));
  return {
    tipoCodigo: 'pregunta_eleccion_multiple',
    esEvaluable: true,
    puntaje,
    contarParaNota: true,
    modoCorreccion: 'igualdad_exacta',
    configuracionJson: JSON.stringify({
      enunciado,
      opciones: conId.map((o) => ({ id: o.id, texto: o.texto })),
      respuestaCorrecta: { opcionIds: conId.filter((o) => o.correcta).map((o) => o.id) },
    }),
  };
}

function slideOrdenar(enunciado: string, pasosEnOrdenCorrecto: string[], puntaje = 10): Omit<CursoSlideUpsertDto, 'orden'> {
  const items = pasosEnOrdenCorrecto.map((texto, i) => ({ id: `p${i + 1}`, texto }));
  return {
    tipoCodigo: 'pregunta_ordenar',
    esEvaluable: true,
    puntaje,
    contarParaNota: true,
    modoCorreccion: 'igualdad_exacta',
    configuracionJson: JSON.stringify({
      enunciado,
      items,
      respuestaCorrecta: { ordenIds: items.map((i) => i.id) },
    }),
  };
}

function slideCompletarHuecos(
  textoConHuecos: string,
  respuestasEnOrden: string[],
  puntaje = 10,
): Omit<CursoSlideUpsertDto, 'orden'> {
  return {
    tipoCodigo: 'pregunta_completar_huecos',
    esEvaluable: true,
    puntaje,
    contarParaNota: true,
    modoCorreccion: 'igualdad_exacta',
    configuracionJson: JSON.stringify({
      texto: textoConHuecos,
      respuestaCorrecta: { textos: respuestasEnOrden },
    }),
  };
}

// ---- "Uso correcto del EPP" — plantilla de referencia (SSOMA), la primera del catálogo ----

function generarSlidesEpp(): Omit<CursoSlideUpsertDto, 'orden'>[] {
  return [
    // 1. Portada (calco de la estructura Genially: franja de color + ícono + título arriba,
    // imagen a la izquierda / panel de descripción a la derecha, barra oscura con CTA abajo)
    slideContenidoLibre([
      // Franja superior de color (acento del curso)
      forma({ x: 0, y: 0, ancho: 1280, alto: 150, colorFondo: '#f5a623', zIndex: 0 }),
      icono({ x: 50, y: 40, ancho: 70, alto: 70, iconoClase: 'ti-rocket', zIndex: 1, colorTexto: '#14100b' }),
      texto({
        x: 150, y: 35, ancho: 1080, alto: 100, zIndex: 1,
        texto: 'CURSO EXPRÉS: USO CORRECTO\nDEL EPP EN OBRA', tamanoFuente: 32, negrita: true, colorTexto: '#14100b',
      }),

      // Izquierda: imagen (placeholder de prueba — el autor la reemplaza por su foto real)
      imagen({ x: 0, y: 150, ancho: 640, alto: 430, zIndex: 1, imagenUrl: 'https://placehold.co/640x430/f3f1ea/948d7c?text=Imagen', bordeRedondeado: 0 }),

      // Punto interactivo sobre la foto, estilo Genially: círculo pulsante que muestra un
      // dato breve al hacer clic, sin abrir un panel modal ni tapar el resto de la pantalla.
      hotspot({
        x: 480, y: 520, ancho: 40, alto: 40, animacionDelayMs: 500,
        hotspotTexto: 'El EPP es la última barrera de defensa: solo actúa cuando ya fallaron los demás controles de seguridad.',
      }),

      // Derecha: panel claro con ícono + descripción
      forma({ x: 640, y: 150, ancho: 640, alto: 430, colorFondo: '#f3f1ea', bordeRedondeado: 0, zIndex: 0 }),
      icono({ x: 690, y: 200, ancho: 50, alto: 50, iconoClase: 'ti-pencil', zIndex: 1, animacionDelayMs: 150 }),
      texto({
        x: 690, y: 270, ancho: 540, alto: 260, zIndex: 1, animacionDelayMs: 200,
        texto: 'Aprende a seleccionar, revisar y cuidar tu Equipo de Protección Personal (EPP) en menos de 5 minutos. Evita errores comunes y refuerza el hábito antes de cada turno.',
        tamanoFuente: 19, colorTexto: '#3a352b',
      }),

      // Barra inferior oscura con CTA: el "botón" es texto plano sin caja (como el
      // ejemplo de Genially) pero sigue siendo un elemento 'boton' real y clickeable —
      // el aprendiz avanza tocando el texto o la flecha, que tiene animación continua
      // (rebote sutil) en vez de un "→" quieto dentro del texto.
      forma({ x: 0, y: 580, ancho: 1280, alto: 140, colorFondo: '#14100b', zIndex: 0 }),
      boton({
        x: 860, y: 622, ancho: 220, alto: 56, zIndex: 1, animacionDelayMs: 350,
        botonTexto: '¡COMENZAR AHORA!', colorFondo: 'transparent', colorTexto: '#ffffff',
        // botonAccion:'pagina' con un ID provisorio: en la vista previa avanza a la
        // siguiente pantalla (ver avanzarPreviewPorClic en curso-editor.ts); una vez el
        // curso existe de verdad, el autor lo reasigna a la pantalla real desde "Acciones".
        botonAccion: 'pagina', botonSlideId: -1,
      }),
      icono({
        x: 1120, y: 618, ancho: 60, alto: 60, zIndex: 1, animacionDelayMs: 400,
        iconoClase: 'ti-arrow-right', colorTexto: '#f5a623', animacionContinua: 'deslizar',
        // Misma acción que el botón "¡COMENZAR AHORA!" de al lado — la flecha ya no es
        // solo decorativa, también navega (ver esInteractivo/alClicElemento, generalizado
        // para cualquier tipo de elemento, no solo 'boton').
        botonAccion: 'pagina', botonSlideId: -1,
      }),
    ]),

    // 2. ¿Qué es el EPP? (calco de la estructura Genially: imagen de borde a borde a la
    // izquierda, panel de color a la derecha con ícono + título + texto)
    slideContenidoLibre([
      forma({ x: 0, y: 0, ancho: 1280, alto: 720, colorFondo: '#f3f1ea', zIndex: 0 }),

      // Izquierda: imagen de borde a borde (placeholder de prueba — el autor la reemplaza)
      imagen({ x: 0, y: 0, ancho: 660, alto: 720, zIndex: 1, imagenUrl: 'https://placehold.co/660x720/f3f1ea/948d7c?text=Imagen', bordeRedondeado: 0 }),

      // Derecha: franja de color con ícono + título + texto
      forma({ x: 660, y: 0, ancho: 620, alto: 720, colorFondo: '#f5a623', bordeRedondeado: 0, zIndex: 0 }),
      icono({ x: 720, y: 90, ancho: 60, alto: 60, iconoClase: 'ti-shield-check', zIndex: 1 }),
      texto({
        x: 720, y: 180, ancho: 500, alto: 90, zIndex: 1, animacionDelayMs: 100,
        texto: '¿Qué es el EPP?', tamanoFuente: 34, negrita: true, colorTexto: '#14100b',
      }),
      texto({
        x: 720, y: 290, ancho: 500, alto: 320, zIndex: 1, animacionDelayMs: 200,
        texto: 'El Equipo de Protección Personal (EPP) es el conjunto de elementos que usa un trabajador para reducir su exposición a riesgos que pueden causarle una lesión. No elimina el peligro: es la última barrera de defensa, después de los controles de ingeniería y los procedimientos de trabajo.',
        tamanoFuente: 19, colorTexto: '#3a2f16',
      }),
    ]),

    // 3. Galería de EPP (carrusel de fotos, estilo Genially: cantidad libre — el autor
    // sube las que necesite desde el panel, no hay límite de 3 imágenes fijas)
    slideContenidoLibre([
      texto({ x: 80, y: 50, ancho: 1120, alto: 60, zIndex: 1, texto: 'Tipos de EPP en obra', tamanoFuente: 34, alineacion: 'center', negrita: true }),
      carrusel({
        x: 140, y: 160, ancho: 1000, alto: 420, animacionDelayMs: 100,
        carruselImagenes: [
          'https://placehold.co/340x420/f5a623/14100b?text=Casco',
          'https://placehold.co/340x420/2a241a/ffffff?text=Guantes',
          'https://placehold.co/340x420/f3f1ea/948d7c?text=Lentes',
          'https://placehold.co/340x420/14100b/f5a623?text=Botas',
          'https://placehold.co/340x420/948d7c/ffffff?text=Arnés',
        ],
      }),
    ]),

    // 4. Errores frecuentes (grid de tarjetas con ícono "i" que expande el detalle EN EL
    // MISMO LUGAR de la tarjeta — overlay.modo:'in-place', calco del patrón de Genially)
    slideContenidoLibre((() => {
      const elementos: ElementoLibre[] = [
        texto({ x: 80, y: 40, ancho: 1120, alto: 60, zIndex: 1, texto: 'Errores frecuentes', tamanoFuente: 34, alineacion: 'center', negrita: true }),
      ];
      const errores = [
        { titulo: 'Usar EPP dañado o con piezas faltantes', detalle: 'Un casco rajado, un arnés con costuras sueltas o un lente rayado ya no protegen como fueron diseñados — repórtalo y pide reemplazo antes de tu turno.' },
        { titulo: 'No ajustarlo a la talla correcta', detalle: 'Un guante grande no da agarre firme y un arnés flojo no sostiene en una caída. El EPP debe quedar ceñido, sin apretar la circulación.' },
        { titulo: 'Guardarlo sin limpiarlo ni revisarlo', detalle: 'Guardar el equipo sucio o mojado acelera el desgaste de correas y costuras. Revísalo y límpialo al terminar cada turno, no solo al empezar.' },
        { titulo: 'Usarlo solo cuando hay supervisión', detalle: 'El riesgo no desaparece cuando nadie está mirando. El EPP se usa siempre que la tarea lo exige, con o sin supervisor presente.' },
      ];
      errores.forEach((e, i) => {
        const x = 80 + (i % 2) * 580;
        const y = 140 + Math.floor(i / 2) * 250;
        elementos.push(
          // El overlay in-place vive en la TARJETA completa (la 'forma'), no en el ícono —
          // así el panel expandido cubre toda la tarjeta, igual que en Genially, en vez de
          // quedar encogido al tamaño chico del ícono que lo disparó.
          forma({
            x, y, ancho: 540, alto: 210, colorFondo: '#2a241a', bordeRedondeado: 12, zIndex: 0,
            overlay: { activo: true, modo: 'in-place', titulo: e.titulo, texto: e.detalle },
          }),
          texto({
            x: x + 30, y: y + 30, ancho: 440, alto: 150, zIndex: 1, animacionDelayMs: i * 100,
            texto: e.titulo, tamanoFuente: 20, colorTexto: '#ffffff', negrita: true,
          }),
          icono({
            x: x + 490, y: y + 160, ancho: 32, alto: 32, zIndex: 1, animacionDelayMs: i * 100,
            iconoClase: 'ti-info-circle', colorTexto: '#f5a623',
          }),
        );
      });
      return elementos;
    })()),

    // 5. Ciclo de vida del EPP (pasos numerados)
    slideContenidoLibre((() => {
      const elementos: ElementoLibre[] = [
        texto({ x: 80, y: 50, ancho: 1120, alto: 60, zIndex: 1, texto: 'Ciclo de vida del EPP', tamanoFuente: 34, negrita: true }),
      ];
      const pasos = [
        'Selección según el riesgo de la tarea',
        'Inspección antes de cada uso',
        'Uso correcto durante toda la actividad',
        'Limpieza y almacenamiento adecuado',
        'Reemplazo apenas se note desgaste',
      ];
      pasos.forEach((p, i) => {
        const y = 140 + i * 105;
        elementos.push(
          forma({ x: 80, y, ancho: 56, alto: 56, colorFondo: '#f5a623', formaTipo: 'circulo', zIndex: 1 }),
          texto({
            x: 160, y: y + 6, ancho: 1000, alto: 44, zIndex: 1, animacionDelayMs: i * 100,
            texto: p, tamanoFuente: 22, negrita: true,
          }),
        );
      });
      return elementos;
    })()),

    // 7. Antes de empezar tu turno (dos columnas + locución en audio con miniatura)
    slideContenidoLibre([
      texto({ x: 80, y: 60, ancho: 1120, alto: 60, zIndex: 1, texto: 'Antes de empezar tu turno', tamanoFuente: 34, alineacion: 'center', negrita: true }),
      forma({ x: 80, y: 160, ancho: 540, alto: 460, colorFondo: '#2a241a', bordeRedondeado: 12, zIndex: 0 }),
      forma({ x: 660, y: 160, ancho: 540, alto: 460, colorFondo: '#2a241a', bordeRedondeado: 12, zIndex: 0 }),
      texto({
        x: 120, y: 200, ancho: 460, alto: 380, zIndex: 1,
        texto: 'Revisa\n\nVerifica que tu EPP no tenga grietas, cortes ni piezas faltantes antes de ponértelo.',
        tamanoFuente: 20, colorTexto: '#ffffff',
      }),
      texto({
        x: 700, y: 200, ancho: 460, alto: 380, zIndex: 1, animacionDelayMs: 150,
        texto: 'Ajusta\n\nCalza el equipo a tu talla y confirma que correas, hebillas y broches queden firmes.',
        tamanoFuente: 20, colorTexto: '#ffffff',
      }),
      // Locución con miniatura + botón de play centrado (estilo Genially, en vez de la
      // barra <audio controls> nativa) — imagen de prueba igual que el resto de imágenes
      // de la plantilla; el autor sube su propio audio real desde el panel de Contenido.
      {
        id: `tpl${Date.now()}_${Math.random().toString(36).slice(2)}`,
        tipo: 'audio', x: 540, y: 640, ancho: 200, alto: 60, zIndex: 2, animacionDelayMs: 300,
        animacionEntrada: 'fade', animacionEasing: 'ease',
        audioUrl: '', audioMiniaturaUrl: 'https://placehold.co/200x60/f5a623/14100b?text=Escuchar',
      },
    ]),

    // 8. Pantalla intro del quiz
    slideContenidoLibre([
      forma({ x: 0, y: 0, ancho: 1280, alto: 720, colorFondo: '#14100b', zIndex: 0 }),
      texto({
        x: 240, y: 280, ancho: 800, alto: 90, zIndex: 1,
        texto: '¡Pon a prueba lo aprendido!', tamanoFuente: 42, alineacion: 'center', negrita: true, colorTexto: '#ffffff',
      }),
      texto({
        x: 340, y: 390, ancho: 600, alto: 50, zIndex: 1, animacionDelayMs: 150,
        texto: '5 preguntas sobre el uso correcto del EPP', tamanoFuente: 18, alineacion: 'center', colorTexto: '#d8d2c2',
      }),
    ]),

    // 9. Pregunta 1: opción múltiple
    slideOpcionMultiple('¿Cuál es la función principal del EPP?', [
      { texto: 'Eliminar el riesgo desde su origen' },
      { texto: 'Reducir la exposición del trabajador al riesgo', correcta: true },
      { texto: 'Reemplazar los procedimientos de seguridad' },
      { texto: 'Aumentar la productividad del trabajador' },
    ]),

    // 10. Pregunta 2: opción múltiple
    slideOpcionMultiple('¿Qué se debe hacer con un EPP que presenta grietas o cortes visibles?', [
      { texto: 'Seguir usándolo hasta terminar el turno' },
      { texto: 'Darlo de baja y reemplazarlo de inmediato', correcta: true },
      { texto: 'Repararlo con cinta adhesiva' },
      { texto: 'Guardarlo para una emergencia' },
    ]),

    // 11. Pregunta 3: ordenar
    slideOrdenar('Ordena el ciclo de vida del EPP:', [
      'Selección según el riesgo de la tarea',
      'Inspección antes de cada uso',
      'Uso correcto durante toda la actividad',
      'Limpieza y almacenamiento adecuado',
    ]),

    // 12. Pregunta 4: completar huecos
    slideCompletarHuecos(
      'Antes de cada turno, el trabajador debe ___ su EPP en busca de daños y verificar que ___ correctamente a su cuerpo.',
      ['inspeccionar', 'ajuste'],
    ),

    // 13. Pregunta 5: elección múltiple
    slideEleccionMultiple('Marca TODAS las señales de que un EPP debe reemplazarse:', [
      { texto: 'Grietas o cortes visibles', correcta: true },
      { texto: 'Olor a nuevo por ser reciente' },
      { texto: 'Piezas faltantes (correas, hebillas)', correcta: true },
      { texto: 'Fecha de vencimiento indicada por el fabricante', correcta: true },
      { texto: 'Color ligeramente distinto al original' },
    ]),
  ];
}

export const PLANTILLAS_CURSO: PlantillaCurso[] = [
  {
    id: 'epp_basico',
    nombre: 'Uso correcto del EPP',
    descripcion: 'Portada + 6 pantallas de contenido (con carrusel, punto interactivo, tarjetas expandibles y audio) + quiz de 5 preguntas.',
    icono: 'ti-shield-check',
    tituloSugerido: 'Uso correcto del Equipo de Protección Personal',
    categoriaSugerida: 'SSOMA',
    generarSlides: generarSlidesEpp,
  },
];
