// Plantillas de partida para el lienzo libre (contenido_libre): en vez de arrancar
// siempre en un canvas vacío, ofrece composiciones pre-armadas (título+imagen, portada,
// dos columnas, etc.) con elementos ya posicionados que el autor edita/reemplaza —
// mismo patrón que la galería de plantillas de Genially, pero acotado a un puñado fijo.
import { ElementoLibre } from '../../dtos/curso.dtos';

let idCorrelativo = 1;
function nuevoId(): string {
  return `tpl${Date.now()}_${idCorrelativo++}`;
}

export interface PlantillaLibre {
  id: string;
  nombre: string;
  icono: string;
  generar: () => ElementoLibre[];
}

function texto(base: Partial<ElementoLibre> & Pick<ElementoLibre, 'x' | 'y' | 'ancho' | 'alto' | 'texto'>): ElementoLibre {
  return {
    id: nuevoId(),
    tipo: 'texto',
    rotacion: 0,
    zIndex: 0,
    animacionEntrada: 'fade',
    animacionDelayMs: 0,
    animacionDuracionMs: 600,
    animacionEasing: 'ease',
    colorTexto: '#14100b',
    tamanoFuente: 24,
    alineacion: 'left',
    negrita: false,
    ...base,
  };
}

function imagen(base: Partial<ElementoLibre> & Pick<ElementoLibre, 'x' | 'y' | 'ancho' | 'alto'>): ElementoLibre {
  return {
    id: nuevoId(),
    tipo: 'imagen',
    rotacion: 0,
    zIndex: 0,
    animacionEntrada: 'fade',
    animacionDelayMs: 150,
    animacionDuracionMs: 600,
    animacionEasing: 'ease',
    imagenUrl: '',
    bordeRedondeado: 10,
    ...base,
  };
}

function forma(base: Partial<ElementoLibre> & Pick<ElementoLibre, 'x' | 'y' | 'ancho' | 'alto'>): ElementoLibre {
  return {
    id: nuevoId(),
    tipo: 'forma',
    rotacion: 0,
    zIndex: 0,
    animacionEntrada: 'ninguna',
    formaTipo: 'rectangulo',
    colorFondo: '#f5a623',
    bordeRedondeado: 0,
    ...base,
  };
}

function boton(base: Partial<ElementoLibre> & Pick<ElementoLibre, 'x' | 'y' | 'ancho' | 'alto'>): ElementoLibre {
  return {
    id: nuevoId(),
    tipo: 'boton',
    rotacion: 0,
    zIndex: 0,
    animacionEntrada: 'fade',
    animacionDelayMs: 300,
    animacionDuracionMs: 600,
    animacionEasing: 'ease',
    botonTexto: 'Continuar',
    colorFondo: '#f5a623',
    colorTexto: '#14100b',
    ...base,
  };
}

export const PLANTILLAS_LIBRE: PlantillaLibre[] = [
  {
    id: 'en_blanco',
    nombre: 'En blanco',
    icono: 'ti-square',
    generar: () => [],
  },
  {
    id: 'portada',
    nombre: 'Portada',
    icono: 'ti-flag',
    generar: () => [
      forma({ x: 0, y: 0, ancho: 1280, alto: 720, colorFondo: '#14100b', zIndex: 0 }),
      texto({
        x: 140, y: 260, ancho: 1000, alto: 100, zIndex: 1,
        texto: 'Título de la portada', tamanoFuente: 56, alineacion: 'center', negrita: true, colorTexto: '#ffffff',
      }),
      texto({
        x: 240, y: 380, ancho: 800, alto: 60, zIndex: 1, animacionDelayMs: 200,
        texto: 'Subtítulo o descripción breve', tamanoFuente: 22, alineacion: 'center', colorTexto: '#d8d2c2',
      }),
      boton({ x: 540, y: 480, ancho: 200, alto: 56, zIndex: 1, animacionDelayMs: 400, botonTexto: 'Empezar' }),
    ],
  },
  {
    id: 'texto_imagen',
    nombre: 'Texto + imagen',
    icono: 'ti-layout-sidebar-right',
    generar: () => [
      texto({
        x: 80, y: 80, ancho: 560, alto: 60, zIndex: 1,
        texto: 'Título de la pantalla', tamanoFuente: 34, negrita: true,
      }),
      texto({
        x: 80, y: 170, ancho: 560, alto: 240, zIndex: 1, animacionDelayMs: 150,
        texto: 'Escribe aquí el contenido explicativo de esta pantalla.', tamanoFuente: 20,
      }),
      imagen({ x: 680, y: 80, ancho: 520, alto: 400, zIndex: 1 }),
    ],
  },
  {
    id: 'dos_columnas',
    nombre: 'Dos columnas',
    icono: 'ti-columns',
    generar: () => [
      texto({
        x: 80, y: 60, ancho: 1120, alto: 60, zIndex: 1,
        texto: 'Título de la pantalla', tamanoFuente: 34, alineacion: 'center', negrita: true,
      }),
      forma({ x: 80, y: 160, ancho: 540, alto: 480, colorFondo: '#2a241a', bordeRedondeado: 12, zIndex: 0 }),
      forma({ x: 660, y: 160, ancho: 540, alto: 480, colorFondo: '#2a241a', bordeRedondeado: 12, zIndex: 0 }),
      texto({
        x: 120, y: 200, ancho: 460, alto: 400, zIndex: 1,
        texto: 'Primer bloque de contenido.', tamanoFuente: 20, colorTexto: '#ffffff',
      }),
      texto({
        x: 700, y: 200, ancho: 460, alto: 400, zIndex: 1, animacionDelayMs: 150,
        texto: 'Segundo bloque de contenido.', tamanoFuente: 20, colorTexto: '#ffffff',
      }),
    ],
  },
  {
    id: 'titulo_video',
    nombre: 'Título + video',
    icono: 'ti-video',
    generar: () => [
      texto({
        x: 80, y: 60, ancho: 1120, alto: 70, zIndex: 1,
        texto: 'Título del video', tamanoFuente: 36, alineacion: 'center', negrita: true,
      }),
      texto({
        x: 190, y: 140, ancho: 900, alto: 50, zIndex: 1, animacionDelayMs: 100,
        texto: 'Breve descripción de lo que se va a ver.', tamanoFuente: 18, alineacion: 'center', colorTexto: '#6b6455',
      }),
      { id: nuevoId(), tipo: 'video', x: 240, y: 210, ancho: 800, alto: 450, zIndex: 1, rotacion: 0, animacionEntrada: 'fade', animacionDelayMs: 200, animacionDuracionMs: 600, animacionEasing: 'ease', videoUrl: '' },
    ],
  },
  {
    id: 'pasos_numerados',
    nombre: 'Pasos numerados',
    icono: 'ti-list-numbers',
    generar: () => {
      const elementos: ElementoLibre[] = [
        texto({ x: 80, y: 50, ancho: 1120, alto: 60, zIndex: 1, texto: 'Título de los pasos', tamanoFuente: 34, negrita: true }),
      ];
      const pasos = ['Primer paso', 'Segundo paso', 'Tercer paso', 'Cuarto paso'];
      pasos.forEach((p, i) => {
        const y = 150 + i * 130;
        elementos.push(
          forma({ x: 80, y, ancho: 60, alto: 60, colorFondo: '#f5a623', formaTipo: 'circulo', zIndex: 1 }),
          texto({
            x: 160, y: y + 8, ancho: 1000, alto: 44, zIndex: 1, animacionDelayMs: i * 100,
            texto: p, tamanoFuente: 24, negrita: true,
          }),
        );
      });
      return elementos;
    },
  },
  {
    id: 'grid_tarjetas',
    nombre: 'Cuadrícula de tarjetas',
    icono: 'ti-layout-grid',
    generar: () => {
      const elementos: ElementoLibre[] = [
        texto({ x: 80, y: 40, ancho: 1120, alto: 60, zIndex: 1, texto: 'Título de la pantalla', tamanoFuente: 34, alineacion: 'center', negrita: true },
        ),
      ];
      for (let i = 0; i < 3; i++) {
        const x = 80 + i * 380;
        elementos.push(
          forma({ x, y: 140, ancho: 350, alto: 500, colorFondo: '#ece7d9', bordeRedondeado: 12, zIndex: 0 }),
          imagen({ x: x + 20, y: 160, ancho: 310, alto: 200, zIndex: 1 }),
          texto({
            x: x + 20, y: 380, ancho: 310, alto: 240, zIndex: 1, animacionDelayMs: i * 100,
            texto: `Tarjeta ${i + 1}`, tamanoFuente: 20, alineacion: 'center',
          }),
        );
      }
      return elementos;
    },
  },
  {
    id: 'antes_despues',
    nombre: 'Antes / Después',
    icono: 'ti-arrows-left-right',
    generar: () => [
      texto({ x: 80, y: 50, ancho: 1120, alto: 60, zIndex: 1, texto: 'Título de la comparación', tamanoFuente: 34, alineacion: 'center', negrita: true }),
      forma({ x: 80, y: 140, ancho: 540, alto: 60, colorFondo: '#b3261e', bordeRedondeado: 8, zIndex: 1 }),
      texto({ x: 80, y: 155, ancho: 540, alto: 40, zIndex: 2, texto: 'Antes (incorrecto)', tamanoFuente: 22, alineacion: 'center', negrita: true, colorTexto: '#ffffff' }),
      imagen({ x: 80, y: 220, ancho: 540, alto: 380, zIndex: 1 }),
      forma({ x: 660, y: 140, ancho: 540, alto: 60, colorFondo: '#0f6e56', bordeRedondeado: 8, zIndex: 1 }),
      texto({ x: 660, y: 155, ancho: 540, alto: 40, zIndex: 2, texto: 'Después (correcto)', tamanoFuente: 22, alineacion: 'center', negrita: true, colorTexto: '#ffffff' }),
      imagen({ x: 660, y: 220, ancho: 540, alto: 380, zIndex: 1, animacionDelayMs: 150 }),
    ],
  },
];
