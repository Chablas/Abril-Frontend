import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  EventEmitter,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ElementoLibre,
  ElementoTipo,
  ElementoPreguntaConfig,
  PreguntaAccionItem,
  PreguntaAccionTipo,
} from '../../../dtos/curso.dtos';
import Swal from 'sweetalert2';
import { CANVAS_ANCHO, CANVAS_ALTO } from '../../curso-player/slides/slide-contenido-libre/slide-contenido-libre';
import { resolverEtiquetaSlide } from '../../curso-player/slide-tipo-registro';
import { IconoPicker } from './icono-picker/icono-picker';
import { TimelineAnimaciones } from './timeline-animaciones/timeline-animaciones';
import { ColorHexInput } from '../../../shared/color-hex-input/color-hex-input';
import { cargarGoogleFont } from '../../../google-font-loader';

/** Los 4 campos de ElementoLibre que guardan una PreguntaAccionResultado — "Si acierta"/
 *  "Si falla" (tipos con un único clic de respuesta) y, para pregunta_emparejar, también
 *  "Al finalizar el temporizador"/"Al finalizar la actividad" (ver canvas-editor.html). */
type RamaAccionPregunta =
  | 'preguntaAccionAcierto'
  | 'preguntaAccionError'
  | 'preguntaAccionTemporizador'
  | 'preguntaAccionFinActividad';

let idCorrelativo = 1;
function nuevoId(): string {
  return `el${Date.now()}_${idCorrelativo++}`;
}

const ANCHO_INICIAL: Record<ElementoTipo, { ancho: number; alto: number }> = {
  texto: { ancho: 320, alto: 80 },
  imagen: { ancho: 320, alto: 240 },
  forma: { ancho: 200, alto: 200 },
  icono: { ancho: 80, alto: 80 },
  boton: { ancho: 220, alto: 60 },
  video: { ancho: 480, alto: 270 },
  audio: { ancho: 280, alto: 56 },
  // No se usa en la práctica: las preguntas se insertan vía agregarElementoPregunta(), que
  // arma el elemento completo directo (ver ahí el tamaño real, 600x320). Solo existe para
  // que este Record<ElementoTipo, ...> sea exhaustivo.
  pregunta: { ancho: 600, alto: 320 },
  carrusel: { ancho: 700, alto: 260 },
  hotspot: { ancho: 40, alto: 40 },
};

export interface EstiloTextoPreset {
  id: string;
  etiqueta: string;
  texto: string;
  tamanoFuente: number;
  negrita: boolean;
  ancho: number;
  alto: number;
}

// Estilos rápidos de texto, estilo Genially (Título 1/2, Subtítulo, Párrafo, listas) — a
// diferencia de la galería de "estilos de texto" decorativos de Genially (fuentes/adornos
// de stock), estos son solo presets de tamaño/peso: no aportaría valor real copiar esa parte.
export const ESTILOS_TEXTO: EstiloTextoPreset[] = [
  { id: 'titulo1', etiqueta: 'Título 1', texto: 'Título 1', tamanoFuente: 48, negrita: true, ancho: 520, alto: 90 },
  { id: 'titulo2', etiqueta: 'Título 2', texto: 'Título 2', tamanoFuente: 34, negrita: true, ancho: 480, alto: 70 },
  { id: 'subtitulo', etiqueta: 'Subtítulo', texto: 'Subtítulo', tamanoFuente: 22, negrita: false, ancho: 420, alto: 50 },
  {
    id: 'parrafo',
    etiqueta: 'Párrafo',
    texto: 'Escribe aquí tu texto.',
    tamanoFuente: 16,
    negrita: false,
    ancho: 380,
    alto: 100,
  },
  {
    id: 'lista-vinetas',
    etiqueta: 'Lista con viñetas',
    texto: '• Punto uno\n• Punto dos\n• Punto tres',
    tamanoFuente: 18,
    negrita: false,
    ancho: 380,
    alto: 120,
  },
  {
    id: 'lista-numerada',
    etiqueta: 'Lista numerada',
    texto: '1. Punto uno\n2. Punto dos\n3. Punto tres',
    tamanoFuente: 18,
    negrita: false,
    ancho: 380,
    alto: 120,
  },
];

/** Fuentes de Google Fonts para el selector de cada rol de "Estilos de texto" — mismo
 *  catálogo curado de antes (skill ui-ux-pro-max), aplanado a una lista de nombres
 *  individuales en vez de pares fijos: acá cada rol (Título 1, Título 2, etc.) elige SU
 *  PROPIA fuente, estilo Genially real (no una pareja única para todo el kit). */
export const FUENTES_DISPONIBLES: string[] = [
  'Poppins',
  'Open Sans',
  'Lexend',
  'Source Sans 3',
  'IBM Plex Sans',
  'Plus Jakarta Sans',
  'Playfair Display',
  'Inter',
  'Bodoni Moda',
  'Jost',
  'DM Sans',
];

export interface EstiloTextoMarca {
  fuente: string;
  tamanoFuente: number;
  color: string;
  negrita: boolean;
  cursiva: boolean;
  subrayado: boolean;
}

export type RolTextoMarca = 'titulo1' | 'titulo2' | 'subtitulo' | 'parrafo';

/** Default de cada rol si el curso todavía no personalizó nada — mismos tamaños que
 *  ESTILOS_TEXTO, fuente de la app y color oscuro neutro. */
export const ESTILOS_TEXTO_MARCA_DEFAULT: Record<RolTextoMarca, EstiloTextoMarca> = {
  titulo1: { fuente: '', tamanoFuente: 48, color: '#14100b', negrita: true, cursiva: false, subrayado: false },
  titulo2: { fuente: '', tamanoFuente: 34, color: '#14100b', negrita: true, cursiva: false, subrayado: false },
  subtitulo: { fuente: '', tamanoFuente: 22, color: '#14100b', negrita: false, cursiva: false, subrayado: false },
  parrafo: { fuente: '', tamanoFuente: 16, color: '#14100b', negrita: false, cursiva: false, subrayado: false },
};

export interface PaletaMarca {
  id: string;
  colores: [string, string, string];
}

// Paletas curadas (fuente: skill ui-ux-pro-max, base de datos de colores por tipo de
// producto — no inventadas a mano), pensadas para capacitación corporativa: profesionales,
// no estridentes.
export const PALETAS_MARCA: PaletaMarca[] = [
  { id: 'b2b', colores: ['#0F172A', '#334155', '#0369A1'] },
  { id: 'inmobiliaria', colores: ['#0F766E', '#14B8A6', '#0369A1'] },
  { id: 'crm', colores: ['#2563EB', '#3B82F6', '#059669'] },
  { id: 'facturacion', colores: ['#1E3A5F', '#2563EB', '#059669'] },
];

export interface EfectoDef {
  valor: string;
  etiqueta: string;
}

// Un solo catálogo de efectos para Entrada/Continuo/Ratón encima/Hacer clic — en Genially
// la galería de efectos es la misma sin importar el disparador (ver EfectoAnimacion en
// curso.dtos.ts). 'fade'/'slide-up'/'slide-left' no se ofrecen aquí a propósito: son
// valores heredados de slides ya guardadas, el picker nuevo usa 'aparecer'/'deslizar'.
export const EFECTOS_ANIMACION: EfectoDef[] = [
  { valor: 'ninguna', etiqueta: 'Ninguno' },
  { valor: 'aparecer', etiqueta: 'Aparecer' },
  { valor: 'enfocar', etiqueta: 'Enfocar' },
  { valor: 'zoom', etiqueta: 'Zoom' },
  { valor: 'encender', etiqueta: 'Encender' },
  { valor: 'deslizar', etiqueta: 'Deslizar' },
  { valor: 'bote', etiqueta: 'Bote' },
  { valor: 'remolino', etiqueta: 'Remolino' },
  { valor: 'rotar', etiqueta: 'Rotar' },
  { valor: 'rodar', etiqueta: 'Rodar' },
];

type SubTabAnimacion = 'entrada' | 'continuo' | 'salida' | 'hover' | 'clic';

// Panel "Preguntas interactivas" (riel), estilo Genially: lista agrupada de tipos de
// pregunta evaluable con su ícono — clic abre el formulario propio de ese tipo en el
// padre (curso-editor), nunca el lienzo libre.
export const PREGUNTAS_INTERACTIVAS: { tipoCodigo: string; etiqueta: string; icono: string }[] = [
  { tipoCodigo: 'pregunta_opcion_multiple', etiqueta: 'Elección única', icono: 'ti-list-check' },
  { tipoCodigo: 'pregunta_eleccion_multiple', etiqueta: 'Elección múltiple', icono: 'ti-checkbox' },
  { tipoCodigo: 'pregunta_vf', etiqueta: 'Verdadero o falso', icono: 'ti-check' },
  { tipoCodigo: 'pregunta_ordenar', etiqueta: 'Ordenar', icono: 'ti-arrows-sort' },
  { tipoCodigo: 'pregunta_completar_huecos', etiqueta: 'Completar huecos', icono: 'ti-text-size' },
  { tipoCodigo: 'pregunta_respuesta_corta', etiqueta: 'Respuesta corta', icono: 'ti-forms' },
  { tipoCodigo: 'pregunta_emparejar', etiqueta: 'Emparejar conceptos', icono: 'ti-arrows-right-left' },
  { tipoCodigo: 'pregunta_desliza_acierta', etiqueta: 'Desliza y acierta', icono: 'ti-swipe' },
];

type ModoArrastre = 'mover' | 'redimensionar' | null;
export type DireccionResize = 'n' | 's' | 'e' | 'o' | 'ne' | 'no' | 'se' | 'so';

export interface GuiaAlineacion {
  eje: 'v' | 'h'; // v = línea vertical (coincidencia en X), h = línea horizontal (coincidencia en Y)
  posicion: number; // en coordenadas del canvas
}

interface RectanguloSeleccion {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

const UMBRAL_SNAP = 8; // px en coordenadas del canvas (1280x720)
const UMBRAL_ARRASTRE_BANDA = 4; // px de pantalla mínimos para considerar que hubo drag (y no un clic)
const HISTORIAL_MAXIMO = 60;

function clonarElementos(elementos: ElementoLibre[]): ElementoLibre[] {
  return typeof structuredClone === 'function'
    ? structuredClone(elementos)
    : (JSON.parse(JSON.stringify(elementos)) as ElementoLibre[]);
}

// Portapapeles a nivel de módulo (no de instancia): cada slide crea/destruye su propio
// CanvasEditor al cambiar de pantalla en el editor, así que guardar esto en la instancia
// se perdería al cambiar de slide. Vive mientras dure la pestaña del navegador.
let portapapeles: ElementoLibre[] | null = null;

@Component({
  selector: 'app-canvas-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IconoPicker, TimelineAnimaciones, ColorHexInput],
  templateUrl: './canvas-editor.html',
  styleUrl: './canvas-editor.css',
})
export class CanvasEditor implements OnChanges, AfterViewInit, OnDestroy {
  readonly canvasAncho = CANVAS_ANCHO;
  readonly canvasAlto = CANVAS_ALTO;

  readonly Math = Math;

  constructor(private cdr: ChangeDetectorRef) {}

  @Input() elementos: ElementoLibre[] = [];
  /** Fondo (color/gradiente CSS) de la pantalla actual; lo gestiona curso-editor. */
  @Input() fondoCss: string | null = null;
  /** Otras pantallas del curso a las que un botón puede saltar ("Ir a página"). */
  @Input() paginasDisponibles: { id: number; titulo: string }[] = [];
  /** Kit de marca del curso (Configuración del curso > Kit de marca) — se ofrece como
   *  swatch rápido en los selectores de color de todo el editor. colorMarcaSecundario/
   *  Terciario/colorTextoMarca son PENDIENTES DE BACKEND (ver nota en curso.dtos.ts): no
   *  persisten todavía entre recargas, pero ya funcionan dentro de esta misma sesión. */
  @Input() colorTema: string | null | undefined = null;
  @Output() colorTemaChange = new EventEmitter<string | null>();
  @Input() colorMarcaSecundario: string | null | undefined = null;
  @Output() colorMarcaSecundarioChange = new EventEmitter<string | null>();
  @Input() colorMarcaTerciario: string | null | undefined = null;
  @Output() colorMarcaTerciarioChange = new EventEmitter<string | null>();
  @Input() colorTextoMarca: string | null | undefined = null;
  @Output() colorTextoMarcaChange = new EventEmitter<string | null>();

  /** Campos de color (de cualquier tipo de elemento) que participan en el recoloreo en
   *  vivo del Kit de marca — ver onCambiarColorMarca. */
  private static readonly CAMPOS_COLOR_RECOLOREABLES: (keyof ElementoLibre)[] = [
    'colorFondo',
    'colorTexto',
    'emparejarColorFondo',
    'emparejarColorSeleccion',
    'emparejarColorBordeCorrecto',
    'emparejarColorBordeIncorrecto',
    'emparejarColorLinea',
    'deslizaColorFondo',
    'deslizaColorTexto',
    'deslizaColorProgreso',
    'deslizaColorDegradado',
    'deslizaColorIconoFalso',
    'deslizaColorFondoBotonFalso',
    'deslizaColorIconoVerdadero',
    'deslizaColorFondoBotonVerdadero',
    'deslizaFeedbackCorrectoColor',
    'deslizaFeedbackIncorrectoColor',
    'deslizaResultadoColorFondo',
    'deslizaResultadoFondoTarjeta',
    'deslizaResultadoColorEtiquetas',
    'deslizaResultadoColorValorCorrecto',
    'deslizaResultadoColorValorIncorrecto',
  ];

  /** Cambiar un color del Kit de marca recolorea EN VIVO cualquier elemento de ESTA
   *  pantalla que use ese mismo color exacto (sustitución de valor, no una referencia de
   *  "tema" — más simple y suficiente: si dos elementos comparten el mismo hex por
   *  coincidencia, también se recolorean juntos, caso borde aceptado). Deliberadamente
   *  NO toca las demás pantallas del curso — hacerlo requeriría cargar y guardar cada slide
   *  en silencio mientras el autor edita otra, demasiado riesgoso para hacerlo solo. */
  private recolorearElementos(anterior: string | null | undefined, nuevo: string): void {
    if (!anterior || anterior === nuevo) return;
    let cambiado = false;
    const nuevosElementos = this.elementos.map((el) => {
      const copia: any = { ...el };
      for (const campo of CanvasEditor.CAMPOS_COLOR_RECOLOREABLES) {
        if (copia[campo] === anterior) {
          copia[campo] = nuevo;
          cambiado = true;
        }
      }
      return copia as ElementoLibre;
    });
    if (cambiado) {
      this.elementos = nuevosElementos;
      this.emitir();
      this.guardarHistorial();
    }
  }

  onCambiarColorMarca(slot: 'principal' | 'secundario' | 'terciario', nuevo: string): void {
    const anterior = slot === 'principal' ? this.colorTema : slot === 'secundario' ? this.colorMarcaSecundario : this.colorMarcaTerciario;
    this.recolorearElementos(anterior, nuevo);
    if (slot === 'principal') this.colorTemaChange.emit(nuevo);
    else if (slot === 'secundario') this.colorMarcaSecundarioChange.emit(nuevo);
    else this.colorMarcaTerciarioChange.emit(nuevo);
  }

  /** "Estilos de texto" del Kit de marca — a diferencia de la primera versión (un solo par
   *  de fuentes para todo), acá CADA rol (Título 1/2, Subtítulo, Párrafo) tiene su propia
   *  fuente/tamaño/color editable, igual que el panel real de Genially. Se guarda como un
   *  único JSON opaco (PENDIENTE DE BACKEND, ver curso.dtos.ts) para no necesitar 12
   *  columnas nuevas — el frontend arma/parsea el objeto. */
  @Input() set estilosTextoMarcaJson(value: string | null | undefined) {
    this._estilosTextoMarcaJson = value;
    try {
      const guardado = value ? JSON.parse(value) : {};
      this.estilosTextoMarca = {
        titulo1: { ...ESTILOS_TEXTO_MARCA_DEFAULT.titulo1, ...guardado.titulo1 },
        titulo2: { ...ESTILOS_TEXTO_MARCA_DEFAULT.titulo2, ...guardado.titulo2 },
        subtitulo: { ...ESTILOS_TEXTO_MARCA_DEFAULT.subtitulo, ...guardado.subtitulo },
        parrafo: { ...ESTILOS_TEXTO_MARCA_DEFAULT.parrafo, ...guardado.parrafo },
      };
    } catch {
      this.estilosTextoMarca = { ...ESTILOS_TEXTO_MARCA_DEFAULT };
    }
    for (const rol of Object.values(this.estilosTextoMarca)) cargarGoogleFont(rol.fuente);
  }
  get estilosTextoMarcaJson(): string | null | undefined {
    return this._estilosTextoMarcaJson;
  }
  private _estilosTextoMarcaJson: string | null | undefined = null;
  @Output() estilosTextoMarcaJsonChange = new EventEmitter<string | null>();

  estilosTextoMarca: Record<RolTextoMarca, EstiloTextoMarca> = { ...ESTILOS_TEXTO_MARCA_DEFAULT };
  readonly fuentesDisponibles = FUENTES_DISPONIBLES;
  readonly rolesTexto: RolTextoMarca[] = ['titulo1', 'titulo2', 'subtitulo', 'parrafo'];
  rolTextoEnEdicion: RolTextoMarca | null = null;

  private static readonly ETIQUETAS_ROL: Record<RolTextoMarca, string> = {
    titulo1: 'Título 1',
    titulo2: 'Título 2',
    subtitulo: 'Subtítulo',
    parrafo: 'Párrafo',
  };
  private static readonly TAMANOS_PREVIEW_ROL: Record<RolTextoMarca, number> = {
    titulo1: 26,
    titulo2: 22,
    subtitulo: 17,
    parrafo: 14,
  };

  etiquetaRolTexto(rol: RolTextoMarca): string {
    return CanvasEditor.ETIQUETAS_ROL[rol];
  }

  tamanoPreviewRolTexto(rol: RolTextoMarca): number {
    return CanvasEditor.TAMANOS_PREVIEW_ROL[rol];
  }

  esRolTitulo(rol: RolTextoMarca): boolean {
    return rol === 'titulo1' || rol === 'titulo2';
  }

  toggleEditarRolTexto(rol: RolTextoMarca): void {
    this.rolTextoEnEdicion = this.rolTextoEnEdicion === rol ? null : rol;
  }

  actualizarEstiloTextoMarca(rol: RolTextoMarca, cambios: Partial<EstiloTextoMarca>): void {
    this.estilosTextoMarca = { ...this.estilosTextoMarca, [rol]: { ...this.estilosTextoMarca[rol], ...cambios } };
    if (cambios.fuente) cargarGoogleFont(cambios.fuente);
    this.estilosTextoMarcaJsonChange.emit(JSON.stringify(this.estilosTextoMarca));

    // En vivo, igual que los colores: cualquier texto de ESTA pantalla creado con este rol
    // (ver rolTexto/agregarTextoConEstilo) se re-pinta al toque con el estilo nuevo.
    let cambiado = false;
    const nuevosElementos = this.elementos.map((el) => {
      if (el.tipo !== 'texto' || el.rolTexto !== rol) return el;
      cambiado = true;
      return {
        ...el,
        fontFamily: cambios.fuente !== undefined ? cambios.fuente || undefined : el.fontFamily,
        tamanoFuente: cambios.tamanoFuente ?? el.tamanoFuente,
        colorTexto: cambios.color ?? el.colorTexto,
        negrita: cambios.negrita ?? el.negrita,
        cursiva: cambios.cursiva ?? el.cursiva,
        subrayado: cambios.subrayado ?? el.subrayado,
      };
    });
    if (cambiado) {
      this.elementos = nuevosElementos;
      this.emitir();
      this.guardarHistorial();
    }
  }

  // ---- Paletas de color del Kit de marca ("Otras opciones" / "Opciones con tu marca") ----

  readonly paletasMarca = PALETAS_MARCA;
  /** Solo dura esta sesión de edición (no hay dónde persistirlas todavía — ver nota
   *  PENDIENTE DE BACKEND). Aun así sirve para armar varias paletas mientras se edita. */
  paletasPersonalizadas: PaletaMarca[] = [];
  mostrarFormularioPaleta = false;
  nuevaPaletaColores: [string, string, string] = ['#f5a623', '#14100b', '#ffffff'];

  elegirPaleta(p: PaletaMarca): void {
    this.onCambiarColorMarca('principal', p.colores[0]);
    this.onCambiarColorMarca('secundario', p.colores[1]);
    this.onCambiarColorMarca('terciario', p.colores[2]);
  }

  /** Rol de "Estilos de texto" que le corresponde a un preset del picker de Texto — los
   *  4 roles principales calzan 1 a 1 (mismos ids); las 2 listas usan el estilo de Párrafo,
   *  no tienen rol propio en el Kit de marca. */
  rolParaPreset(preset: EstiloTextoPreset): RolTextoMarca {
    return (['titulo1', 'titulo2', 'subtitulo', 'parrafo'] as const).includes(preset.id as RolTextoMarca)
      ? (preset.id as RolTextoMarca)
      : 'parrafo';
  }

  estiloParaPreset(preset: EstiloTextoPreset): EstiloTextoMarca {
    return this.estilosTextoMarca[this.rolParaPreset(preset)];
  }

  guardarPaletaPersonalizada(): void {
    this.paletasPersonalizadas = [
      ...this.paletasPersonalizadas,
      { id: 'custom-' + Date.now(), colores: [...this.nuevaPaletaColores] },
    ];
    this.mostrarFormularioPaleta = false;
    this.nuevaPaletaColores = ['#f5a623', '#14100b', '#ffffff'];
  }

  get swatchesColor(): string[] {
    const base = [
      this.colorTema,
      this.colorMarcaSecundario,
      this.colorMarcaTerciario,
      '#f5a623',
      '#14100b',
      '#ffffff',
    ].filter((c): c is string => !!c);
    return [...new Set(base)];
  }
  @Output() elementosChange = new EventEmitter<ElementoLibre[]>();

  /** Pide al padre subir una imagen para este elemento (el padre conoce el servicio de subida). */
  @Output() subirImagen = new EventEmitter<ElementoLibre>();
  /** Pide al padre subir un archivo de audio para este elemento. */
  @Output() subirAudio = new EventEmitter<ElementoLibre>();
  @Output() subirAudioPregunta = new EventEmitter<ElementoLibre>();
  /** Añade una imagen más al carrusel (push al array, no reemplaza) — cantidad libre. */
  @Output() subirImagenCarrusel = new EventEmitter<ElementoLibre>();
  /** Miniatura opcional del audio con botón de play centrado, estilo Genially. */
  @Output() subirAudioMiniatura = new EventEmitter<ElementoLibre>();
  /** Imagen opcional del globo de un punto interactivo (hotspot). */
  @Output() subirImagenHotspot = new EventEmitter<ElementoLibre>();
  /** Pide al padre abrir el selector de "Añadir página" directo en la pestaña del banco
   *  de preguntas — se dispara desde la pastilla "Banco de preguntas" del panel de abajo. */
  @Output() abrirBancoPreguntas = new EventEmitter<void>();

  @ViewChild('lienzo') private lienzoRef?: ElementRef<HTMLDivElement>;
  @ViewChild('lienzoEnvoltorio') private envoltorioRef?: ElementRef<HTMLDivElement>;
  @ViewChild('canvasCuerpo') private cuerpoRef?: ElementRef<HTMLDivElement>;

  // ---- Zoom: por defecto el lienzo se ajusta (escala) al espacio disponible sin
  // deformarse; el usuario puede fijar un zoom manual que ignora ese ajuste automático. ----
  private escalaAjuste = 1;
  private zoomManual: number | null = null;
  private resizeObserver?: ResizeObserver;
  private readonly MARGEN_ENVOLTORIO = 10; // padding visual alrededor del lienzo

  get escalaFinal(): number {
    return this.zoomManual ?? this.escalaAjuste;
  }

  get porcentajeZoom(): number {
    return Math.round(this.escalaFinal * 100);
  }

  zoomIn(): void {
    this.zoomManual = Math.min(2, Math.round((this.escalaFinal + 0.1) * 10) / 10);
    this.fijarScrollArribaTrasZoom();
  }

  zoomOut(): void {
    this.zoomManual = Math.max(0.2, Math.round((this.escalaFinal - 0.1) * 10) / 10);
    this.fijarScrollArribaTrasZoom();
  }

  zoomAjustar(): void {
    this.zoomManual = null;
    this.fijarScrollArribaTrasZoom();
  }

  /** Permite escribir un porcentaje exacto de zoom (input numérico junto al %). */
  zoomFijar(porcentaje: number): void {
    if (!Number.isFinite(porcentaje)) return;
    this.zoomManual = Math.max(0.2, Math.min(2, Math.round(porcentaje) / 100));
    this.fijarScrollArribaTrasZoom();
  }

  /** Al cambiar el zoom el lienzo cambia de tamaño y el navegador reacomoda el scroll del
   *  envoltorio a su cuenta, dejando visible cualquier parte del lienzo (a veces tapando el
   *  título, que suele estar arriba). Forzamos volver a la esquina superior izquierda, que es
   *  el punto de referencia esperado (igual que al abrir la pantalla por primera vez). */
  private fijarScrollArribaTrasZoom(): void {
    this.cdr.detectChanges();
    const reset = () => {
      const wrap = this.envoltorioRef?.nativeElement;
      const cuerpo = this.cuerpoRef?.nativeElement;
      if (wrap) {
        wrap.scrollTop = 0;
        wrap.scrollLeft = 0;
      }
      if (cuerpo) {
        cuerpo.scrollTop = 0;
        cuerpo.scrollLeft = 0;
      }
    };
    // Doble rAF: el primero solo garantiza que ya pasamos el frame donde se aplicaron
    // los nuevos estilos; el layout final (scrollHeight real) puede no estar listo hasta
    // el siguiente, así que reseteamos en ambos por si acaso.
    requestAnimationFrame(() => {
      reset();
      requestAnimationFrame(reset);
    });
  }

  ngAfterViewInit(): void {
    if (!this.envoltorioRef || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.recalcularEscalaAjuste());
    this.resizeObserver.observe(this.envoltorioRef.nativeElement);
    this.recalcularEscalaAjuste();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private recalcularEscalaAjuste(): void {
    if (!this.envoltorioRef) return;
    const rect = this.envoltorioRef.nativeElement.getBoundingClientRect();
    const anchoDisponible = Math.max(100, rect.width - this.MARGEN_ENVOLTORIO * 2);
    const altoDisponible = Math.max(100, rect.height - this.MARGEN_ENVOLTORIO * 2);
    const nuevaEscala = Math.min(anchoDisponible / this.canvasAncho, altoDisponible / this.canvasAlto, 1);
    if (Math.abs(nuevaEscala - this.escalaAjuste) > 0.001) {
      this.escalaAjuste = nuevaEscala;
      this.cdr.detectChanges();
    }
  }

  /** Fuente de verdad de la selección. Puede tener 0, 1 o varios ids. */
  seleccionadosIds = new Set<string>();
  /** Id del elemento en edición de texto in-situ (doble clic sobre texto/botón). */
  editandoTextoId: string | null = null;

  readonly estilosTexto = ESTILOS_TEXTO;
  mostrarEstilosTexto = false;
  posicionPopoverTexto = { left: 0, top: 0 };

  toggleEstilosTexto(boton: HTMLElement): void {
    this.mostrarEstilosTexto = !this.mostrarEstilosTexto;
    if (this.mostrarEstilosTexto) {
      const rect = boton.getBoundingClientRect();
      this.posicionPopoverTexto = { left: rect.right + 6, top: rect.top };
    }
  }

  readonly preguntasInteractivas = PREGUNTAS_INTERACTIVAS;
  mostrarPanelPreguntas = false;
  /** null = ancla por arriba (top), definido = ancla por abajo (bottom) — este botón vive
   *  pegado al fondo del riel, así que casi siempre se abre hacia arriba para no salirse
   *  de la pantalla (ver togglePanelPreguntas). */
  posicionPanelPreguntas: { left: number; top: number | null; bottom: number | null } = {
    left: 0,
    top: 0,
    bottom: null,
  };

  togglePanelPreguntas(boton: HTMLElement): void {
    this.mostrarPanelPreguntas = !this.mostrarPanelPreguntas;
    if (this.mostrarPanelPreguntas) {
      const rect = boton.getBoundingClientRect();
      const espacioAbajo = window.innerHeight - rect.top;
      if (espacioAbajo < 400) {
        // No entra hacia abajo (botón pegado al fondo del riel): ancla desde abajo hacia arriba.
        this.posicionPanelPreguntas = { left: rect.right + 6, top: null, bottom: window.innerHeight - rect.bottom };
      } else {
        this.posicionPanelPreguntas = { left: rect.right + 6, top: rect.top, bottom: null };
      }
    }
  }

  // ---- Paneles "Insertar" (Imagen/Video/Audio) y "Elementos" (Forma/Ícono), estilo
  // Genially: antes cada uno era su propio botón del riel que agregaba un elemento en
  // blanco directo; ahora se agrupan en un popover compartido (mismo mecanismo de overlay
  // fixed que "Preguntas") — menos botones sueltos en el riel, mejor organizados. ----

  mostrarPanelInsertar = false;
  posicionPanelInsertar = { left: 0, top: 0 };

  togglePanelInsertar(boton: HTMLElement): void {
    this.mostrarPanelInsertar = !this.mostrarPanelInsertar;
    if (this.mostrarPanelInsertar) {
      const rect = boton.getBoundingClientRect();
      this.posicionPanelInsertar = { left: rect.right + 6, top: rect.top };
    }
  }

  mostrarPanelElementos = false;
  posicionPanelElementos = { left: 0, top: 0 };

  togglePanelElementos(boton: HTMLElement): void {
    this.mostrarPanelElementos = !this.mostrarPanelElementos;
    if (this.mostrarPanelElementos) {
      const rect = boton.getBoundingClientRect();
      this.posicionPanelElementos = { left: rect.right + 6, top: rect.top };
    }
  }

  /** Panel "Estilo" (Kit de marca), estilo Genially — 100% opcional: si no se toca nada
   *  acá, todo sigue con los colores por defecto de siempre (naranja/negro/blanco). No hay
   *  botón "Aplicar a todo"/retroactivo a propósito (decisión del usuario): el kit solo
   *  queda disponible como acceso rápido para elementos NUEVOS que se inserten de ahora en
   *  adelante, nunca reescribe lo que ya existe en el curso. */
  mostrarPanelEstilo = false;
  posicionPanelEstilo: { left: number; top: number | null; bottom: number | null } = {
    left: 0,
    top: 0,
    bottom: null,
  };

  togglePanelEstilo(boton: HTMLElement): void {
    this.mostrarPanelEstilo = !this.mostrarPanelEstilo;
    if (this.mostrarPanelEstilo) {
      const rect = boton.getBoundingClientRect();
      const espacioAbajo = window.innerHeight - rect.top;
      if (espacioAbajo < 420) {
        this.posicionPanelEstilo = { left: rect.right + 6, top: null, bottom: window.innerHeight - rect.bottom };
      } else {
        this.posicionPanelEstilo = { left: rect.right + 6, top: rect.top, bottom: null };
      }
    }
  }

  /** Imagen/Audio: agrega el elemento en blanco Y de inmediato abre el selector de
   *  archivo — en Genially "Insertar > Subir imagen" es un solo paso, no dos. */
  agregarImagenDesdeRail(): void {
    this.agregarElemento('imagen');
    this.pedirSubirImagen();
    this.mostrarPanelInsertar = false;
  }

  agregarAudioDesdeRail(): void {
    this.agregarElemento('audio');
    this.pedirSubirAudio();
    this.mostrarPanelInsertar = false;
  }

  agregarVideoDesdeRail(): void {
    this.agregarElemento('video');
    this.mostrarPanelInsertar = false;
  }

  /** "Ventana": un ícono con overlay ya activado (clic → se abre un panel con
   *  título/texto/imagen), listo para que el autor solo escriba el contenido. */
  agregarVentanaDesdeRail(): void {
    this.agregarElemento('icono');
    const el = this.seleccionado;
    if (el) {
      el.iconoClase = 'ti-frame';
      el.overlay = { activo: true, titulo: '', texto: '', imagenUrl: '' };
    }
    this.mostrarPanelInsertar = false;
  }

  /** "Etiqueta": una píldora chica de texto, decorativa (sin acción de clic). */
  agregarEtiquetaDesdeRail(): void {
    this.agregarElemento('boton');
    const el = this.seleccionado;
    if (el) {
      el.botonTexto = 'Etiqueta';
      el.ancho = 140;
      el.alto = 40;
      el.bordeRedondeado = 999;
    }
    this.mostrarPanelInsertar = false;
  }

  /** "Enlace": botón preconfigurado para abrir una URL externa. */
  agregarEnlaceDesdeRail(): void {
    this.agregarElemento('boton');
    const el = this.seleccionado;
    if (el) {
      el.botonTexto = 'Enlace';
      el.botonAccion = 'url';
    }
    this.mostrarPanelInsertar = false;
  }

  /** "Ir a página": botón preconfigurado para saltar a otra pantalla del curso. */
  agregarIrAPaginaDesdeRail(): void {
    this.agregarElemento('boton');
    const el = this.seleccionado;
    if (el) {
      el.botonTexto = 'Ir a página';
      el.botonAccion = 'pagina';
    }
    this.mostrarPanelInsertar = false;
  }

  agregarFormaDesdeRail(): void {
    this.agregarElemento('forma');
    this.mostrarPanelElementos = false;
  }

  agregarIconoDesdeRail(): void {
    this.agregarElemento('icono');
    this.mostrarPanelElementos = false;
  }

  agregarBotonDesdeRail(): void {
    this.agregarElemento('boton');
    this.mostrarPanelElementos = false;
  }

  agregarCarruselDesdeRail(): void {
    this.agregarElemento('carrusel');
    this.mostrarPanelInsertar = false;
  }

  agregarHotspotDesdeRail(): void {
    this.agregarElemento('hotspot');
    this.mostrarPanelElementos = false;
  }

  @HostListener('document:click')
  alHacerClicFuera(): void {
    this.mostrarEstilosTexto = false;
    this.mostrarPanelPreguntas = false;
    this.mostrarPanelInsertar = false;
    this.mostrarPanelElementos = false;
    this.mostrarPanelEstilo = false;
  }

  agregarTextoConEstilo(preset: EstiloTextoPreset): void {
    const el: ElementoLibre = {
      id: nuevoId(),
      tipo: 'texto',
      x: Math.round(this.canvasAncho / 2 - preset.ancho / 2),
      y: Math.round(this.canvasAlto / 2 - preset.alto / 2),
      ancho: preset.ancho,
      alto: preset.alto,
      rotacion: 0,
      zIndex: this.elementos.length,
      animacionEntrada: 'fade',
      animacionDelayMs: 0,
      animacionDuracionMs: 600,
      animacionEasing: 'ease',
      texto: preset.texto,
      // Kit de marca: si el rol (Título 1/2, Subtítulo, Párrafo) tiene fuente/color
      // personalizados, se usan acá — "lista-vinetas"/"lista-numerada" toman el estilo de
      // Párrafo (no son un rol propio del kit). Sin nada personalizado, cae en los mismos
      // valores de siempre (preset.tamanoFuente/negrita, color #14100b).
      colorTexto: this.estiloParaPreset(preset).color,
      tamanoFuente: preset.tamanoFuente,
      alineacion: 'left',
      negrita: this.estiloParaPreset(preset).negrita,
      cursiva: this.estiloParaPreset(preset).cursiva,
      subrayado: this.estiloParaPreset(preset).subrayado,
      fontFamily: this.estiloParaPreset(preset).fuente || undefined,
      rolTexto: this.rolParaPreset(preset),
    };
    this.elementos = [...this.elementos, el];
    this.emitir();
    this.seleccionadosIds = new Set([el.id]);
    this.mostrarEstilosTexto = false;
  }
  menuContextualId: string | null = null;
  menuContextualFondo = false;
  menuContextualPos = { x: 0, y: 0 };
  private posicionPegadoFondo: { x: number; y: number } | null = null;

  readonly direccionesResize: DireccionResize[] = ['n', 's', 'e', 'o', 'ne', 'no', 'se', 'so'];

  guiasActivas: GuiaAlineacion[] = [];
  bandaSeleccion: RectanguloSeleccion | null = null;

  private modo: ModoArrastre = null;
  private direccionResize: DireccionResize = 'se';
  private origenPuntero = { x: 0, y: 0 };
  private origenElemento = { x: 0, y: 0, ancho: 0, alto: 0 };
  private elementoArrastrando: ElementoLibre | null = null;
  /** Posiciones originales de todo el grupo al iniciar un "mover", para desplazarlas juntas. */
  private origenGrupo = new Map<string, { x: number; y: number }>();
  private bandaOrigenPantalla = { x: 0, y: 0 };
  private bandaHuboArrastre = false;

  // ---- Historial (deshacer/rehacer) ----
  // Guarda snapshots completos e independientes (clonados) de `elementos`. `ultimoEmitido`
  // permite distinguir un cambio del @Input que viene de fuera (otra slide, recarga) de uno
  // que es simplemente el eco de nuestro propio elementosChange.emit() — solo el primero
  // debe reiniciar el historial.
  private historial: ElementoLibre[][] = [];
  private historialIndice = -1;
  private ultimoEmitido: ElementoLibre[] | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elementos'] && changes['elementos'].currentValue !== this.ultimoEmitido) {
      this.reiniciarHistorial();
    }
  }

  private reiniciarHistorial(): void {
    this.historial = [clonarElementos(this.elementos)];
    this.historialIndice = 0;
  }

  get puedeDeshacer(): boolean {
    return this.historialIndice > 0;
  }

  get puedeRehacer(): boolean {
    return this.historialIndice < this.historial.length - 1;
  }

  deshacer(): void {
    if (!this.puedeDeshacer) return;
    this.historialIndice--;
    this.restaurarDesdeHistorial();
  }

  rehacer(): void {
    if (!this.puedeRehacer) return;
    this.historialIndice++;
    this.restaurarDesdeHistorial();
  }

  private restaurarDesdeHistorial(): void {
    const snapshot = clonarElementos(this.historial[this.historialIndice]);
    this.elementos = snapshot;
    this.ultimoEmitido = snapshot;
    const idsVigentes = new Set(snapshot.map((e) => e.id));
    this.seleccionadosIds = new Set([...this.seleccionadosIds].filter((id) => idsVigentes.has(id)));
    this.menuContextualId = null;
    this.elementosChange.emit(this.elementos);
  }

  @HostListener('window:keydown', ['$event'])
  alPresionarTecla(event: KeyboardEvent): void {
    const objetivo = event.target as HTMLElement;
    const enCampoDeTexto =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(objetivo?.tagName) || objetivo?.isContentEditable;
    if (enCampoDeTexto) return; // se deja el comportamiento nativo del campo de texto/edición in-situ

    if ((event.key === 'Delete' || event.key === 'Backspace') && this.seleccionadosIds.size) {
      event.preventDefault();
      this.eliminarSeleccionado();
      return;
    }

    const modificador = event.ctrlKey || event.metaKey;
    if (!modificador) return;

    const tecla = event.key.toLowerCase();
    if (tecla === 'z' && event.shiftKey) {
      event.preventDefault();
      this.rehacer();
    } else if (tecla === 'z') {
      event.preventDefault();
      this.deshacer();
    } else if (tecla === 'y') {
      event.preventDefault();
      this.rehacer();
    } else if (tecla === 'c') {
      event.preventDefault();
      this.copiarSeleccion();
    } else if (tecla === 'x') {
      event.preventDefault();
      this.cortarSeleccion();
    } else if (tecla === 'v') {
      event.preventDefault();
      this.pegar();
    }
  }

  // ---- Copiar / cortar / pegar ----
  // El portapapeles vive a nivel de módulo (ver `portapapeles` arriba), por eso funciona
  // aunque se copie en una slide y se pegue luego de cambiar a otra (el componente se
  // destruye y recrea al cambiar de slide en curso-editor, pero el módulo no).

  get haySeleccionParaCopiar(): boolean {
    return this.elementosSeleccionados.length > 0;
  }

  get hayPortapapeles(): boolean {
    return !!portapapeles?.length;
  }

  copiarSeleccion(): void {
    if (!this.haySeleccionParaCopiar) return;
    portapapeles = clonarElementos(this.elementosSeleccionados);
    this.menuContextualId = null;
  }

  cortarSeleccion(): void {
    if (!this.haySeleccionParaCopiar) return;
    this.copiarSeleccion();
    this.eliminarSeleccionado();
  }

  pegar(): void {
    if (!portapapeles?.length) return;
    const zBase = Math.max(0, ...this.elementos.map((e) => e.zIndex ?? 0)) + 1;
    const destino = this.posicionPegadoFondo;
    // Centro del grupo copiado, para poder recolocarlo sobre el punto donde se pidió pegar.
    const centroX = portapapeles.reduce((s, e) => s + e.x + e.ancho / 2, 0) / portapapeles.length;
    const centroY = portapapeles.reduce((s, e) => s + e.y + e.alto / 2, 0) / portapapeles.length;

    const pegados: ElementoLibre[] = clonarElementos(portapapeles).map((el, i) => {
      const x = destino ? el.x + (destino.x - centroX) : el.x + 30;
      const y = destino ? el.y + (destino.y - centroY) : el.y + 30;
      return {
        ...el,
        id: nuevoId(),
        x: Math.round(Math.max(0, Math.min(x, this.canvasAncho - el.ancho))),
        y: Math.round(Math.max(0, Math.min(y, this.canvasAlto - el.alto))),
        zIndex: zBase + i,
      };
    });

    this.elementos = [...this.elementos, ...pegados];
    this.seleccionadosIds = new Set(pegados.map((e) => e.id));
    this.menuContextualId = null;
    this.menuContextualFondo = false;
    this.posicionPegadoFondo = null;
    this.emitir();
  }

  /** Registra en el historial ediciones que no pasan por emitir() (campos con ngModel
   *  directo sobre el objeto, ej. texto/color): se llama en (focusout) del panel. */
  guardarHistorial(): void {
    const actual = JSON.stringify(this.elementos);
    if (JSON.stringify(this.historial[this.historialIndice]) === actual) return;
    this.commit();
  }

  /** Único elemento seleccionado (para el panel de propiedades); null si hay 0 o varios. */
  get seleccionadoId(): string | null {
    return this.seleccionadosIds.size === 1 ? [...this.seleccionadosIds][0] : null;
  }

  get seleccionado(): ElementoLibre | null {
    const id = this.seleccionadoId;
    return id ? (this.elementos.find((e) => e.id === id) ?? null) : null;
  }

  get elementosSeleccionados(): ElementoLibre[] {
    return this.elementos.filter((e) => this.seleccionadosIds.has(e.id));
  }

  get haySeleccionMultiple(): boolean {
    return this.seleccionadosIds.size > 1;
  }

  estaSeleccionado(id: string): boolean {
    return this.seleccionadosIds.has(id);
  }

  agregarElemento(tipo: ElementoTipo): void {
    const base = ANCHO_INICIAL[tipo];
    const el: ElementoLibre = {
      id: nuevoId(),
      tipo,
      x: Math.round(this.canvasAncho / 2 - base.ancho / 2),
      y: Math.round(this.canvasAlto / 2 - base.alto / 2),
      ancho: base.ancho,
      alto: base.alto,
      rotacion: 0,
      zIndex: this.elementos.length,
      animacionEntrada: 'fade',
      animacionDelayMs: 0,
      animacionDuracionMs: 600,
      animacionEasing: 'ease',
      ...this.camposIniciales(tipo),
    };
    this.elementos = [...this.elementos, el];
    this.emitir();
    this.seleccionadosIds = new Set([el.id]);
  }

  /** Inserta el logo de marca del curso como elemento de imagen ya cargado, arriba a la
   *  derecha (posición habitual de un logo, estilo Genially/marca de agua). */
  agregarElementoImagen(url: string): void {
    const ancho = 140;
    const alto = 70;
    const el: ElementoLibre = {
      id: nuevoId(),
      tipo: 'imagen',
      x: this.canvasAncho - ancho - 24,
      y: 24,
      ancho,
      alto,
      rotacion: 0,
      zIndex: this.elementos.length,
      animacionEntrada: 'fade',
      animacionDelayMs: 0,
      animacionDuracionMs: 600,
      animacionEasing: 'ease',
      imagenUrl: url,
      bordeRedondeado: 0,
    };
    this.elementos = [...this.elementos, el];
    this.emitir();
    this.seleccionadosIds = new Set([el.id]);
  }

  /** Inserta una pregunta evaluable como elemento del lienzo libre (estilo Genially: la
   *  pregunta convive con el resto del contenido de la pantalla). Solo se permite UNA por
   *  pantalla — el backend asume una sola respuestaCorrecta por CursoSlide. */
  agregarElementoPregunta(tipoCodigo: string): void {
    if (this.elementos.some((e) => e.tipo === 'pregunta')) {
      Swal.fire({
        icon: 'warning',
        title: 'Ya hay una pregunta en esta pantalla',
        text: 'Solo se permite una pregunta evaluable por pantalla. Bórrala primero si quieres cambiarla de tipo.',
      });
      return;
    }

    const esBinaria = tipoCodigo === 'pregunta_vf';
    const pregunta: ElementoPreguntaConfig = {
      tipoCodigo,
      puntaje: 10,
      contarParaNota: true,
      kicker: '',
      enunciado: '',
      imagenUrl: '',
      opciones: esBinaria
        ? [
            { id: 'true', texto: 'Verdadero', imagenUrl: '', correcta: true },
            { id: 'false', texto: 'Falso', imagenUrl: '', correcta: false },
          ]
        : [
            { id: 'a', texto: '', imagenUrl: '', correcta: true },
            { id: 'b', texto: '', imagenUrl: '', correcta: false },
          ],
      items: [
        { id: '1', texto: '' },
        { id: '2', texto: '' },
      ],
      respuestaTexto: '',
      variantes: '',
      textoHuecos: '',
      respuestasHuecos: [],
      izquierda: [{ id: 'i1', texto: '' }],
      derecha: [{ id: 'd1', texto: '' }],
      parejas: {},
      deslizaTarjetas: [
        { id: nuevoId(), texto: '', imagenUrl: '', correcta: true },
        { id: nuevoId(), texto: '', imagenUrl: '', correcta: false },
      ],
      deslizaUmbralAprobarPct: 100,
      ordenAleatorio: false,
      // Default explícito (no undefined) para que el checkbox del editor coincida con el
      // comportamiento real: opción única/eleccion múltiple siempre pedían confirmar antes
      // de este cambio, VF/desliza-acierta siempre respondían al primer clic.
      botonEnviarActivo: tipoCodigo === 'pregunta_opcion_multiple',
    };

    const ancho = 600;
    const alto = 320;
    const el: ElementoLibre = {
      id: nuevoId(),
      tipo: 'pregunta',
      x: Math.round(this.canvasAncho / 2 - ancho / 2),
      y: Math.round(this.canvasAlto / 2 - alto / 2),
      ancho,
      alto,
      rotacion: 0,
      zIndex: this.elementos.length,
      pregunta,
      // Default Genially: el recuadro nace transparente sobre el fondo de la pantalla, no
      // en una caja blanca opaca (eso solo pasa si el autor elige el estilo "Claro" a mano).
      preguntaEstilo: 'adaptado-claro',
    };
    this.elementos = [...this.elementos, el];
    this.emitir();
    this.seleccionadosIds = new Set([el.id]);
    this.pestanaPropiedades = 'contenido';
  }

  // ---- Edición de los campos de una pregunta embebida (el.pregunta) ----

  marcarOpcionCorrectaPregunta(i: number): void {
    const opciones = this.seleccionado?.pregunta?.opciones;
    if (!opciones) return;
    opciones.forEach((o, idx) => (o.correcta = idx === i));
  }

  toggleOpcionCorrectaPregunta(i: number): void {
    const o = this.seleccionado?.pregunta?.opciones[i];
    if (o) o.correcta = !o.correcta;
  }

  agregarOpcionPregunta(): void {
    const p = this.seleccionado?.pregunta;
    if (!p) return;
    const letra = String.fromCharCode(97 + p.opciones.length);
    p.opciones.push({ id: letra, texto: '', imagenUrl: '', correcta: false });
  }

  quitarOpcionPregunta(i: number): void {
    this.seleccionado?.pregunta?.opciones.splice(i, 1);
  }

  // ---- Tarjetas de "Desliza y acierta" (mazo, estilo Genially) ----

  agregarTarjetaDesliza(): void {
    const p = this.seleccionado?.pregunta;
    if (!p) return;
    p.deslizaTarjetas.push({ id: nuevoId(), texto: '', imagenUrl: '', correcta: true });
  }

  quitarTarjetaDesliza(i: number): void {
    const p = this.seleccionado?.pregunta;
    if (!p || p.deslizaTarjetas.length <= 1) return;
    p.deslizaTarjetas.splice(i, 1);
  }

  agregarItemOrdenarPregunta(): void {
    const p = this.seleccionado?.pregunta;
    if (!p) return;
    p.items.push({ id: String(p.items.length + 1), texto: '' });
  }

  quitarItemOrdenarPregunta(i: number): void {
    this.seleccionado?.pregunta?.items.splice(i, 1);
  }

  onCambioTextoHuecosPregunta(): void {
    const p = this.seleccionado?.pregunta;
    if (!p) return;
    const cantidad = (p.textoHuecos.match(/___/g) || []).length;
    const actuales = p.respuestasHuecos;
    p.respuestasHuecos =
      cantidad > actuales.length
        ? [...actuales, ...Array(cantidad - actuales.length).fill('')]
        : actuales.slice(0, cantidad);
  }

  agregarConceptoPregunta(lado: 'izquierda' | 'derecha'): void {
    const p = this.seleccionado?.pregunta;
    if (!p) return;
    const lista = p[lado];
    lista.push({ id: (lado === 'izquierda' ? 'i' : 'd') + (lista.length + 1), texto: '' });
  }

  quitarConceptoPregunta(lado: 'izquierda' | 'derecha', i: number): void {
    const p = this.seleccionado?.pregunta;
    if (!p) return;
    const quitado = p[lado].splice(i, 1)[0];
    if (quitado && lado === 'izquierda') delete p.parejas[quitado.id];
  }

  iconoPreguntaTipo(tipoCodigo: string | undefined): string {
    const preset = this.preguntasInteractivas.find((t) => t.tipoCodigo === tipoCodigo);
    return preset?.icono ?? 'ti-help-circle';
  }

  etiquetaPreguntaTipo(tipoCodigo: string | undefined): string {
    return resolverEtiquetaSlide(tipoCodigo ?? '') ?? 'Pregunta';
  }

  private camposIniciales(tipo: ElementoTipo): Partial<ElementoLibre> {
    switch (tipo) {
      case 'texto':
        return {
          texto: 'Texto nuevo',
          colorTexto: this.colorTextoMarca || '#14100b',
          tamanoFuente: 28,
          alineacion: 'left',
          negrita: false,
          fontFamily: this.estilosTextoMarca.parrafo.fuente || undefined,
        };
      case 'imagen':
        return { imagenUrl: '', bordeRedondeado: 8 };
      case 'forma':
        return { formaTipo: 'rectangulo', colorFondo: '#f5a623', bordeRedondeado: 8 };
      case 'icono':
        return { iconoClase: 'ti-star', colorTexto: '#f5a623' };
      case 'boton':
        return { botonTexto: 'Ver más', botonUrl: '', colorFondo: '#f5a623', colorTexto: '#14100b' };
      case 'video':
        return { videoUrl: '' };
      case 'audio':
        return { audioUrl: '', audioAutoplay: false };
      case 'pregunta':
        // No se usa: agregarElementoPregunta() arma el elemento completo directo, con
        // valores por defecto propios de cada tipo de pregunta (opciones, puntaje, etc.).
        return {};
      case 'carrusel':
        return { carruselImagenes: [], carruselVisibles: 3, bordeRedondeado: 8 };
      case 'hotspot':
        return { hotspotTexto: 'Escribe aquí...', hotspotColor: '#f5a623' };
    }
  }

  /** Clic sobre un elemento: shift/ctrl agrega o quita de la selección; clic simple la reemplaza. */
  seleccionar(id: string, event: MouseEvent): void {
    event.stopPropagation();
    const conModificador = event.shiftKey || event.ctrlKey || event.metaKey;
    if (conModificador) {
      const copia = new Set(this.seleccionadosIds);
      copia.has(id) ? copia.delete(id) : copia.add(id);
      this.seleccionadosIds = copia;
    } else if (!this.seleccionadosIds.has(id)) {
      this.seleccionadosIds = new Set([id]);
    }
    this.menuContextualId = null;
  }

  deseleccionar(): void {
    this.seleccionadosIds = new Set();
    this.menuContextualId = null;
    this.menuContextualFondo = false;
  }

  eliminarSeleccionado(): void {
    if (!this.seleccionadosIds.size) return;
    this.elementos = this.elementos.filter((e) => !this.seleccionadosIds.has(e.id));
    this.seleccionadosIds = new Set();
    this.emitir();
  }

  moverCapa(direccion: -1 | 1): void {
    for (const el of this.elementosSeleccionados) el.zIndex = (el.zIndex ?? 0) + direccion;
    if (this.elementosSeleccionados.length) this.emitir();
  }

  pedirSubirImagen(): void {
    if (this.seleccionado) this.subirImagen.emit(this.seleccionado);
  }

  pedirSubirAudio(): void {
    if (this.seleccionado) this.subirAudio.emit(this.seleccionado);
  }

  pedirSubirAudioPregunta(): void {
    if (this.seleccionado) this.subirAudioPregunta.emit(this.seleccionado);
  }

  pedirSubirImagenCarrusel(): void {
    if (this.seleccionado) this.subirImagenCarrusel.emit(this.seleccionado);
  }

  quitarImagenCarrusel(el: ElementoLibre, indice: number): void {
    el.carruselImagenes = (el.carruselImagenes || []).filter((_, i) => i !== indice);
    this.guardarHistorial();
  }

  pedirSubirAudioMiniatura(): void {
    if (this.seleccionado) this.subirAudioMiniatura.emit(this.seleccionado);
  }

  quitarAudioMiniatura(el: ElementoLibre): void {
    el.audioMiniaturaUrl = '';
    this.guardarHistorial();
  }

  pedirSubirImagenHotspot(): void {
    if (this.seleccionado) this.subirImagenHotspot.emit(this.seleccionado);
  }

  /** Tipos donde "Disposición horizontal/vertical" tiene efecto real en el reproductor
   *  (ver slide-contenido-libre.html): una fila de opciones/píldoras. Ordenar, respuesta
   *  corta, completar huecos y emparejar tienen su propio layout fijo (lista arrastrable,
   *  input de texto, texto con huecos, dos columnas) y no lo respetan. */
  // ---- Acciones de la pregunta embebida, ramas Acierto/Error (estilo Genially: lista de
  // acciones apiladas por rama, con un menú "+ Añadir acción" — ver ReportFindings del
  // 25-sep-2026 en memoria del proyecto). ----

  readonly tiposAccionPregunta: { tipo: PreguntaAccionTipo; etiqueta: string; icono: string }[] = [
    { tipo: 'abrir_ventana', etiqueta: 'Abrir ventana', icono: 'ti-frame' },
    { tipo: 'audio', etiqueta: 'Reproducir audio', icono: 'ti-volume' },
    { tipo: 'pagina', etiqueta: 'Ir a página', icono: 'ti-arrow-right' },
    { tipo: 'scroll_elemento', etiqueta: 'Scroll hasta elemento', icono: 'ti-arrows-vertical' },
    { tipo: 'efecto', etiqueta: 'Efecto', icono: 'ti-sparkles' },
    { tipo: 'mostrar_elemento', etiqueta: 'Mostrar elemento', icono: 'ti-eye' },
    { tipo: 'ocultar_elemento', etiqueta: 'Ocultar elemento', icono: 'ti-eye-off' },
  ];

  menuAccionAbiertoPara: string | null = null;
  accionEditandoId: string | null = null;

  toggleMenuAccionPregunta(clave: string): void {
    this.menuAccionAbiertoPara = this.menuAccionAbiertoPara === clave ? null : clave;
  }

  agregarAccionPregunta(el: ElementoLibre, rama: RamaAccionPregunta, tipo: PreguntaAccionTipo): void {
    if (!el[rama]) el[rama] = { acciones: [] };
    const item: PreguntaAccionItem = { id: 'acc' + Date.now() + Math.round(Math.random() * 9999), tipo };
    el[rama]!.acciones.push(item);
    this.menuAccionAbiertoPara = null;
    this.accionEditandoId = item.id;
    this.guardarHistorial();
  }

  quitarAccionPregunta(el: ElementoLibre, rama: RamaAccionPregunta, index: number): void {
    el[rama]?.acciones.splice(index, 1);
    this.guardarHistorial();
  }

  toggleEditarAccionPregunta(id: string): void {
    this.accionEditandoId = this.accionEditandoId === id ? null : id;
  }

  iconoAccionPregunta(tipo: PreguntaAccionTipo): string {
    return this.tiposAccionPregunta.find((t) => t.tipo === tipo)?.icono ?? 'ti-bolt';
  }

  etiquetaAccionPregunta(item: PreguntaAccionItem): string {
    const base = this.tiposAccionPregunta.find((t) => t.tipo === item.tipo)?.etiqueta ?? 'Acción';
    switch (item.tipo) {
      case 'pagina': {
        const pagina = this.paginasDisponibles.find((p) => p.id === item.slideId);
        return pagina ? `Ir a página: ${pagina.titulo}` : base;
      }
      case 'mostrar_elemento':
      case 'ocultar_elemento':
      case 'scroll_elemento': {
        const objetivo = this.elementos.find((e) => e.id === item.elementoId);
        return objetivo ? `${base}: ${this.etiquetaElementoCanvas(objetivo)}` : base;
      }
      default:
        return base;
    }
  }

  /** Otros elementos del mismo lienzo a los que puede apuntar una acción de
   *  scroll/mostrar/ocultar (nunca a sí misma). */
  elementosParaAccion(actual: ElementoLibre): ElementoLibre[] {
    return this.elementos.filter((e) => e.id !== actual.id);
  }

  etiquetaElementoCanvas(el: ElementoLibre): string {
    switch (el.tipo) {
      case 'texto':
        return 'Texto: ' + (el.texto || '(vacío)').slice(0, 24);
      case 'imagen':
        return 'Imagen';
      case 'forma':
        return 'Forma';
      case 'icono':
        return 'Ícono';
      case 'boton':
        return 'Botón: ' + (el.botonTexto || '(sin texto)');
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio';
      case 'pregunta':
        return 'Pregunta';
      default:
        return 'Elemento';
    }
  }

  temporizadorMinutos(el: ElementoLibre): number {
    return Math.floor((el.preguntaTemporizadorSeg ?? 0) / 60);
  }

  temporizadorSegundos(el: ElementoLibre): number {
    return (el.preguntaTemporizadorSeg ?? 0) % 60;
  }

  fijarTemporizadorMinutos(el: ElementoLibre, minutos: number): void {
    el.preguntaTemporizadorSeg = Math.max(0, minutos || 0) * 60 + this.temporizadorSegundos(el);
    this.guardarHistorial();
  }

  fijarTemporizadorSegundos(el: ElementoLibre, segundos: number): void {
    el.preguntaTemporizadorSeg = this.temporizadorMinutos(el) * 60 + Math.min(59, Math.max(0, segundos || 0));
    this.guardarHistorial();
  }

  /** Texto de la derecha emparejada con este concepto de la izquierda, para el preview del
   *  canvas — antes solo se pintaba la columna izquierda, sin mostrar con qué está pareado. */
  etiquetaDerechaEmparejarPregunta(preg: ElementoPreguntaConfig | undefined, izquierdaId: string): string {
    if (!preg) return '(sin pareja)';
    const derechaId = preg.parejas[izquierdaId];
    const derecha = preg.derecha.find((d) => d.id === derechaId);
    return derecha?.texto || '(sin pareja)';
  }

  disposicionAplicaAPreguntaTipo(tipoCodigo: string | undefined): boolean {
    return (
      tipoCodigo === 'pregunta_vf' || tipoCodigo === 'pregunta_opcion_multiple' || tipoCodigo === 'pregunta_eleccion_multiple'
    );
  }

  // ---- Panel con pestañas Interactividad / Animación (estilo Genially) ----

  readonly efectosAnimacion = EFECTOS_ANIMACION;
  pestanaPropiedades: 'interactividad' | 'animacion' | 'contenido' | 'diseno' = 'animacion';
  subTabAnimacion: SubTabAnimacion = 'entrada';

  efectoActual(el: ElementoLibre): string {
    switch (this.subTabAnimacion) {
      case 'entrada':
        return el.animacionEntrada || 'ninguna';
      case 'continuo':
        return el.animacionContinua || 'ninguna';
      case 'salida':
        return el.animacionSalida || 'ninguna';
      case 'hover':
        return el.animacionInteraccion?.disparador === 'hover' ? el.animacionInteraccion.efecto : 'ninguna';
      case 'clic':
        return el.animacionInteraccion?.disparador === 'clic' ? el.animacionInteraccion.efecto : 'ninguna';
    }
  }

  fijarEfecto(el: ElementoLibre, valor: string): void {
    switch (this.subTabAnimacion) {
      case 'entrada':
        el.animacionEntrada = valor as any;
        break;
      case 'continuo':
        el.animacionContinua = valor === 'ninguna' ? undefined : (valor as any);
        break;
      case 'salida':
        el.animacionSalida = valor === 'ninguna' ? undefined : (valor as any);
        break;
      case 'hover':
      case 'clic':
        el.animacionInteraccion = valor === 'ninguna' ? null : { disparador: this.subTabAnimacion, efecto: valor as any };
        break;
    }
    this.guardarHistorial();
  }

  toggleOverlay(activo: boolean): void {
    const el = this.seleccionado;
    if (!el) return;
    el.overlay = { ...(el.overlay || {}), activo };
    this.emitir();
  }

  /** Acción de clic para elementos que NO son 'boton' (ícono, forma, imagen, texto...) —
   *  estilo Genially: cualquier objeto del lienzo puede navegar a otra página o abrir un
   *  enlace, no solo el botón dedicado. Reutiliza los mismos campos botonAccion/botonUrl/
   *  botonSlideId que ya tiene el modelo (ver ElementoLibre en curso.dtos.ts). */
  fijarAccionClicElemento(el: ElementoLibre, valor: 'ninguna' | 'pagina' | 'url'): void {
    el.botonAccion = valor === 'ninguna' ? undefined : valor;
    if (valor !== 'pagina') el.botonSlideId = null;
    if (valor !== 'url') el.botonUrl = '';
    this.guardarHistorial();
  }

  // ---- Menú contextual (clic derecho): duplicar, capas, bloquear, eliminar ----
  // Actúa sobre toda la selección actual (si el clic derecho fue sobre un elemento ya
  // seleccionado junto con otros); si fue sobre uno fuera de la selección, la reemplaza.

  abrirMenuContextual(el: ElementoLibre, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.seleccionadosIds.has(el.id)) this.seleccionadosIds = new Set([el.id]);
    this.menuContextualId = el.id;
    const rect = (event.currentTarget as HTMLElement).closest('.canvas-lienzo')?.getBoundingClientRect();
    this.menuContextualPos = rect
      ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
      : { x: 0, y: 0 };
  }

  cerrarMenuContextual(): void {
    this.menuContextualId = null;
    this.menuContextualFondo = false;
  }

  /** Clic derecho sobre el fondo vacío del lienzo: solo ofrece "Pegar" ahí mismo. */
  abrirMenuContextualFondo(event: MouseEvent): void {
    event.preventDefault();
    this.menuContextualId = null;
    this.menuContextualFondo = true;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuContextualPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.posicionPegadoFondo = {
      x: ((event.clientX - rect.left) / rect.width) * this.canvasAncho,
      y: ((event.clientY - rect.top) / rect.height) * this.canvasAlto,
    };
  }

  duplicarElemento(): void {
    const seleccion = this.elementosSeleccionados;
    if (!seleccion.length) return;
    const zBase = this.elementos.length;
    const copias: ElementoLibre[] = seleccion.map((el, i) => ({
      ...el,
      id: nuevoId(),
      x: Math.min(this.canvasAncho - el.ancho, el.x + 24),
      y: Math.min(this.canvasAlto - el.alto, el.y + 24),
      zIndex: zBase + i,
    }));
    this.elementos = [...this.elementos, ...copias];
    this.seleccionadosIds = new Set(copias.map((c) => c.id));
    this.menuContextualId = null;
    this.emitir();
  }

  toggleBloqueado(): void {
    const seleccion = this.elementosSeleccionados;
    if (!seleccion.length) return;
    const bloquearTodos = seleccion.some((e) => !e.bloqueado);
    for (const el of seleccion) el.bloqueado = bloquearTodos;
    this.menuContextualId = null;
    this.emitir();
  }

  traerAlFrente(): void {
    const seleccion = this.elementosSeleccionados;
    if (!seleccion.length) return;
    let z = Math.max(0, ...this.elementos.map((e) => e.zIndex ?? 0)) + 1;
    for (const el of seleccion) el.zIndex = z++;
    this.menuContextualId = null;
    this.emitir();
  }

  enviarAtras(): void {
    const seleccion = this.elementosSeleccionados;
    if (!seleccion.length) return;
    let z = Math.min(0, ...this.elementos.map((e) => e.zIndex ?? 0)) - seleccion.length;
    for (const el of seleccion) el.zIndex = z++;
    this.menuContextualId = null;
    this.emitir();
  }

  eliminarDesdeMenu(): void {
    this.menuContextualId = null;
    this.eliminarSeleccionado();
  }

  // ---- Edición de texto in-situ (doble clic sobre texto/botón, como Genially) ----

  iniciarEdicionTexto(el: ElementoLibre, event: MouseEvent): void {
    if (el.bloqueado || (el.tipo !== 'texto' && el.tipo !== 'boton')) return;
    event.preventDefault();
    event.stopPropagation();
    this.seleccionadosIds = new Set([el.id]);
    this.editandoTextoId = el.id;
    this.cdr.detectChanges();
    // El elemento contenteditable recién aparece en este mismo ciclo (*ngIf); se enfoca
    // en el siguiente frame para poder seleccionar todo el texto de una.
    requestAnimationFrame(() => {
      const nodo = document.querySelector<HTMLElement>(`[data-editable-id="${el.id}"]`);
      if (!nodo) return;
      nodo.focus();
      const rango = document.createRange();
      rango.selectNodeContents(nodo);
      const seleccion = window.getSelection();
      seleccion?.removeAllRanges();
      seleccion?.addRange(rango);
    });
  }

  confirmarEdicionTexto(el: ElementoLibre, event: FocusEvent): void {
    const texto = (event.target as HTMLElement).innerText.trim();
    if (el.tipo === 'texto') el.texto = texto;
    else if (el.tipo === 'boton') el.botonTexto = texto;
    this.editandoTextoId = null;
    this.guardarHistorial();
  }

  /** Enter confirma (sin salto de línea); Escape cancela sin guardar cambios de texto. */
  alTeclearEnEdicion(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    } else if (event.key === 'Escape') {
      this.editandoTextoId = null;
      (event.target as HTMLElement).blur();
    }
  }

  // ---- Rotación (handle circular sobre el elemento) ----

  iniciarRotar(el: ElementoLibre, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (el.bloqueado || !this.lienzoRef) return;
    this.seleccionadosIds = new Set([el.id]);

    const calcularCentro = () => {
      const rectLienzo = this.lienzoRef!.nativeElement.getBoundingClientRect();
      const escala = rectLienzo.width / this.canvasAncho;
      return {
        x: rectLienzo.left + (el.x + el.ancho / 2) * escala,
        y: rectLienzo.top + (el.y + el.alto / 2) * escala,
      };
    };
    const centro = calcularCentro();
    const anguloInicialPuntero = (Math.atan2(event.clientY - centro.y, event.clientX - centro.x) * 180) / Math.PI;
    const rotacionInicial = el.rotacion || 0;

    const onMove = (e: PointerEvent) => {
      const anguloActual = (Math.atan2(e.clientY - centro.y, e.clientX - centro.x) * 180) / Math.PI;
      let nuevaRotacion = rotacionInicial + (anguloActual - anguloInicialPuntero);
      // Snap cada 15° si se mantiene shift, como en Genially/PowerPoint.
      if (e.shiftKey) nuevaRotacion = Math.round(nuevaRotacion / 15) * 15;
      el.rotacion = Math.round(((nuevaRotacion % 360) + 360) % 360);
      this.cdr.detectChanges();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.emitir();
      this.cdr.detectChanges();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ---- Arrastre (mover / redimensionar) ----
  // Todo el cálculo ocurre en el sistema de coordenadas fijo del canvas (canvasAncho x
  // canvasAlto); el factor de escala se obtiene del ancho real renderizado del lienzo,
  // que se escala responsive vía CSS (width: 100%, aspect-ratio fijo).

  iniciarMover(el: ElementoLibre, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const conModificador = event.shiftKey || event.ctrlKey || event.metaKey;
    if (conModificador) {
      const copia = new Set(this.seleccionadosIds);
      copia.has(el.id) ? copia.delete(el.id) : copia.add(el.id);
      this.seleccionadosIds = copia;
    } else if (!this.seleccionadosIds.has(el.id)) {
      this.seleccionadosIds = new Set([el.id]);
    }
    this.menuContextualId = null;
    this.menuContextualFondo = false;
    if (el.bloqueado) return;

    this.modo = 'mover';
    this.elementoArrastrando = el;
    this.origenPuntero = { x: event.clientX, y: event.clientY };
    this.origenElemento = { x: el.x, y: el.y, ancho: el.ancho, alto: el.alto };
    this.origenGrupo = new Map(
      this.elementosSeleccionados.filter((e) => !e.bloqueado).map((e) => [e.id, { x: e.x, y: e.y }]),
    );
    this.suscribirArrastre();
  }

  iniciarRedimensionar(el: ElementoLibre, direccion: DireccionResize, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (el.bloqueado) return;
    this.seleccionadosIds = new Set([el.id]);
    this.modo = 'redimensionar';
    this.direccionResize = direccion;
    this.elementoArrastrando = el;
    this.origenPuntero = { x: event.clientX, y: event.clientY };
    this.origenElemento = { x: el.x, y: el.y, ancho: el.ancho, alto: el.alto };
    this.suscribirArrastre();
  }

  private suscribirArrastre(): void {
    // App zoneless: window.addEventListener crudo no dispara refresco solo — forzamos
    // detectChanges en cada pointermove para que el arrastre se vea fluido en pantalla.
    const onMove = (e: PointerEvent) => {
      this.alMoverPuntero(e);
      this.cdr.detectChanges();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.modo = null;
      this.elementoArrastrando = null;
      this.origenGrupo = new Map();
      this.guiasActivas = [];
      this.emitir();
      this.cdr.detectChanges();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private alMoverPuntero(event: PointerEvent): void {
    if (!this.modo || !this.elementoArrastrando || !this.lienzoRef) return;
    const anchoRenderizado = this.lienzoRef.nativeElement.getBoundingClientRect().width;
    const escala = anchoRenderizado / this.canvasAncho;

    const deltaX = (event.clientX - this.origenPuntero.x) / escala;
    const deltaY = (event.clientY - this.origenPuntero.y) / escala;
    const el = this.elementoArrastrando;
    const guias: GuiaAlineacion[] = [];

    if (this.modo === 'mover') {
      let x = Math.max(0, Math.min(this.origenElemento.x + deltaX, this.canvasAncho - el.ancho));
      let y = Math.max(0, Math.min(this.origenElemento.y + deltaY, this.canvasAlto - el.alto));

      const candX = this.candidatosX(el.id);
      const candY = this.candidatosY(el.id);

      const snapIzq = this.snap(x, candX);
      const snapCentroX = this.snap(x + el.ancho / 2, candX);
      const snapDer = this.snap(x + el.ancho, candX);
      if (snapIzq.snapped) {
        x = snapIzq.valor;
        guias.push({ eje: 'v', posicion: snapIzq.valor });
      } else if (snapCentroX.snapped) {
        x = snapCentroX.valor - el.ancho / 2;
        guias.push({ eje: 'v', posicion: snapCentroX.valor });
      } else if (snapDer.snapped) {
        x = snapDer.valor - el.ancho;
        guias.push({ eje: 'v', posicion: snapDer.valor });
      }

      const snapArriba = this.snap(y, candY);
      const snapCentroY = this.snap(y + el.alto / 2, candY);
      const snapAbajo = this.snap(y + el.alto, candY);
      if (snapArriba.snapped) {
        y = snapArriba.valor;
        guias.push({ eje: 'h', posicion: snapArriba.valor });
      } else if (snapCentroY.snapped) {
        y = snapCentroY.valor - el.alto / 2;
        guias.push({ eje: 'h', posicion: snapCentroY.valor });
      } else if (snapAbajo.snapped) {
        y = snapAbajo.valor - el.alto;
        guias.push({ eje: 'h', posicion: snapAbajo.valor });
      }

      // Delta final (post-snap) del elemento "líder"; se aplica igual al resto del grupo
      // para que la selección se mueva en bloque manteniendo distancias relativas.
      const deltaFinalX = Math.round(x) - this.origenElemento.x;
      const deltaFinalY = Math.round(y) - this.origenElemento.y;

      for (const [id, origen] of this.origenGrupo) {
        const otro = this.elementos.find((e) => e.id === id);
        if (!otro) continue;
        otro.x = Math.round(Math.max(0, Math.min(origen.x + deltaFinalX, this.canvasAncho - otro.ancho)));
        otro.y = Math.round(Math.max(0, Math.min(origen.y + deltaFinalY, this.canvasAlto - otro.alto)));
      }

      this.guiasActivas = guias;
      return;
    }

    const MIN = 30;
    const dir = this.direccionResize;
    const o = this.origenElemento;
    const candX = this.candidatosX(el.id);
    const candY = this.candidatosY(el.id);

    // Los bordes norte/oeste desplazan x/y además de cambiar el tamaño; los bordes
    // sur/este solo cambian ancho/alto. Cada eje se resuelve por separado según si la
    // dirección lo incluye (p.ej. 'ne' toca x/ancho por 'e' y y/alto por 'n').
    if (dir.includes('e')) {
      let borde = Math.max(o.x + MIN, Math.min(o.x + o.ancho + deltaX, this.canvasAncho));
      const s = this.snap(borde, candX);
      if (s.snapped) {
        borde = s.valor;
        guias.push({ eje: 'v', posicion: s.valor });
      }
      el.ancho = Math.round(borde - o.x);
    } else if (dir.includes('o')) {
      let borde = Math.max(0, Math.min(o.x + deltaX, o.x + o.ancho - MIN));
      const s = this.snap(borde, candX);
      if (s.snapped) {
        borde = s.valor;
        guias.push({ eje: 'v', posicion: s.valor });
      }
      el.x = Math.round(borde);
      el.ancho = Math.round(o.x + o.ancho - borde);
    }

    if (dir.includes('s')) {
      let borde = Math.max(o.y + MIN, Math.min(o.y + o.alto + deltaY, this.canvasAlto));
      const s = this.snap(borde, candY);
      if (s.snapped) {
        borde = s.valor;
        guias.push({ eje: 'h', posicion: s.valor });
      }
      el.alto = Math.round(borde - o.y);
    } else if (dir.includes('n')) {
      let borde = Math.max(0, Math.min(o.y + deltaY, o.y + o.alto - MIN));
      const s = this.snap(borde, candY);
      if (s.snapped) {
        borde = s.valor;
        guias.push({ eje: 'h', posicion: s.valor });
      }
      el.y = Math.round(borde);
      el.alto = Math.round(o.y + o.alto - borde);
    }

    this.guiasActivas = guias;
  }

  // ---- Snapping / guías de alineación ----
  // Candidatos: bordes y centro del canvas, más borde izq/centro/der (o arriba/centro/abajo)
  // de cada otro elemento. Se excluye siempre el elemento que se está arrastrando.

  private candidatosX(idExcluido: string): number[] {
    const candidatos = [0, this.canvasAncho / 2, this.canvasAncho];
    for (const e of this.elementos) {
      if (e.id === idExcluido) continue;
      candidatos.push(e.x, e.x + e.ancho / 2, e.x + e.ancho);
    }
    return candidatos;
  }

  private candidatosY(idExcluido: string): number[] {
    const candidatos = [0, this.canvasAlto / 2, this.canvasAlto];
    for (const e of this.elementos) {
      if (e.id === idExcluido) continue;
      candidatos.push(e.y, e.y + e.alto / 2, e.y + e.alto);
    }
    return candidatos;
  }

  private snap(valor: number, candidatos: number[]): { valor: number; snapped: boolean } {
    let mejor = valor;
    let mejorDistancia = UMBRAL_SNAP;
    for (const c of candidatos) {
      const distancia = Math.abs(valor - c);
      if (distancia < mejorDistancia) {
        mejor = c;
        mejorDistancia = distancia;
      }
    }
    return { valor: mejor, snapped: mejor !== valor };
  }

  // ---- Selección por banda (rubber-band): clic y arrastre sobre el fondo del lienzo ----

  iniciarBandaSeleccion(event: PointerEvent): void {
    if (!this.lienzoRef || event.button !== 0) return;
    this.menuContextualFondo = false;
    this.bandaHuboArrastre = false;
    this.bandaOrigenPantalla = { x: event.clientX, y: event.clientY };
    const rect = this.lienzoRef.nativeElement.getBoundingClientRect();
    const escala = rect.width / this.canvasAncho;
    const xCanvas = (event.clientX - rect.left) / escala;
    const yCanvas = (event.clientY - rect.top) / escala;
    this.bandaSeleccion = { x: xCanvas, y: yCanvas, ancho: 0, alto: 0 };

    const conModificador = event.shiftKey || event.ctrlKey || event.metaKey;
    const seleccionPrevia = conModificador ? new Set(this.seleccionadosIds) : new Set<string>();

    const onMove = (e: PointerEvent) => {
      if (!this.lienzoRef) return;
      const distancia = Math.hypot(e.clientX - this.bandaOrigenPantalla.x, e.clientY - this.bandaOrigenPantalla.y);
      if (distancia > UMBRAL_ARRASTRE_BANDA) this.bandaHuboArrastre = true;

      const r = this.lienzoRef.nativeElement.getBoundingClientRect();
      const esc = r.width / this.canvasAncho;
      const xActual = (e.clientX - r.left) / esc;
      const yActual = (e.clientY - r.top) / esc;
      this.bandaSeleccion = {
        x: Math.min(xCanvas, xActual),
        y: Math.min(yCanvas, yActual),
        ancho: Math.abs(xActual - xCanvas),
        alto: Math.abs(yActual - yCanvas),
      };

      if (this.bandaHuboArrastre) {
        const banda = this.bandaSeleccion;
        const dentro = this.elementos.filter(
          (el) =>
            el.x < banda.x + banda.ancho &&
            el.x + el.ancho > banda.x &&
            el.y < banda.y + banda.alto &&
            el.y + el.alto > banda.y,
        );
        this.seleccionadosIds = new Set([...seleccionPrevia, ...dentro.map((e) => e.id)]);
      }
      this.cdr.detectChanges();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.bandaSeleccion = null;
      if (!this.bandaHuboArrastre) this.deseleccionar();
      this.cdr.detectChanges();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  seleccionarDesdeTimeline(id: string): void {
    this.seleccionadosIds = new Set([id]);
    this.menuContextualId = null;
  }

  confirmarCambioTimeline(): void {
    this.commit();
  }

  private emitir(): void {
    this.commit();
  }

  private commit(): void {
    this.historial = this.historial.slice(0, this.historialIndice + 1);
    this.historial.push(clonarElementos(this.elementos));
    if (this.historial.length > HISTORIAL_MAXIMO) this.historial.shift();
    this.historialIndice = this.historial.length - 1;
    this.ultimoEmitido = this.elementos;
    this.elementosChange.emit(this.elementos);
  }
}
