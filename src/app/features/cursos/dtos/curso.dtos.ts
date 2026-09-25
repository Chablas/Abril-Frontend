// DTOs espejo de Abril_Backend/Features/CursoModule/Application/Dtos (CursoDtos.cs, CursoIntentoDtos.cs)

export interface CursoDto {
  id: number;
  titulo: string;
  descripcion?: string | null;
  categoriaNombre?: string | null;
  rolDestino?: string | null;
  notaMinimaAprobacion: number;
  activo: boolean;
  colorTema?: string | null;
}

export interface CursoSlideDto {
  id: number;
  cursoId: number;
  orden: number;
  tipoCodigo: string;
  esEvaluable: boolean;
  puntaje?: number | null;
  modoCorreccion?: string | null;
  configuracionJson: string;
}

// ---- DTOs de administración (crear/editar curso y slides) ----

export interface CursoUpsertDto {
  titulo: string;
  descripcion?: string | null;
  categoriaNombre?: string | null;
  rolDestino?: string | null;
  notaMinimaAprobacion: number;
  activo: boolean;
  colorTema?: string | null;
}

export interface CursoSlideUpsertDto {
  orden: number;
  tipoCodigo: string;
  esEvaluable: boolean;
  puntaje?: number | null;
  modoCorreccion?: string | null;
  configuracionJson: string;
}

export interface IniciarIntentoDto {
  cursoId: number;
  latitud?: number | null;
  longitud?: number | null;
  precisionGpsMetros?: number | null;
  deviceFingerprint?: string | null;
}

export interface IniciarIntentoResultDto {
  intentoId: number;
}

export interface ResponderSlideDto {
  slideId: number;
  respuestaJson: string;
  tiempoRespuestaSeg?: number | null;
}

export interface ResponderSlideResultDto {
  esCorrecta?: boolean | null;
  puntajeObtenido?: number | null;
}

export interface FinalizarIntentoDto {
  declaracionJuradaAceptada: boolean;
  declaracionTexto: string;
}

export interface CursoIntentoEvidenciaDto {
  ipAddress: string;
  latitud?: number | null;
  longitud?: number | null;
  precisionGpsMetros?: number | null;
  userAgent: string;
  deviceFingerprint?: string | null;
  declaracionJuradaAceptada: boolean;
  declaracionTexto: string;
  hashSha256?: string | null;
  createdAt: string;
  selladoAt?: string | null;
}

export interface FinalizarIntentoResultDto {
  intentoId: number;
  notaFinal: number;
  aprobado: boolean;
  fechaInicio: string;
  fechaFin: string;
  evidencia: CursoIntentoEvidenciaDto;
}

export interface CursoIntentoRespuestaDto {
  id: number;
  cursoSlideId: number;
  respuestaJson: string;
  esCorrecta?: boolean | null;
  puntajeObtenido?: number | null;
  tiempoRespuestaSeg?: number | null;
  createdAt: string;
}

export interface CursoIntentoDetalleDto {
  id: number;
  cursoId: number;
  userId: number;
  fechaInicio: string;
  fechaFin?: string | null;
  notaFinal?: number | null;
  aprobado?: boolean | null;
  estado: string;
  respuestas: CursoIntentoRespuestaDto[];
  evidencia?: CursoIntentoEvidenciaDto | null;
}

// ---- Shapes libres de configuracionJson / respuestaJson por tipoCodigo ----
// Estos NO vienen del backend (configuracionJson es texto libre "shape según tipoCodigo"),
// son convenciones del frontend para parsear/emitir cada tipo de slide.

// Convención de frontend (no viene del backend): cada slide puede declarar opcionalmente
// un bloque "estilo" dentro de su configuracionJson para personalizar el fondo animado del
// player (ver fondo-animado/). Si una slide no trae "estilo", el player aplica una paleta
// de marca por defecto que rota de forma determinística según el índice de la slide.
export interface SlideEstilo {
  fondoClaro?: string; // CSS background completo, ej. "linear-gradient(135deg, #eaf4fa 0%, #005d9d 100%)"
  fondoOscuro?: string;
  burbujas?: boolean; // default true; false para desactivar en una slide puntual
  textoClaro?: boolean; // default true (texto blanco sobre el gradiente); false para texto oscuro cuando el fondo configurado es claro
}

export interface ContenidoConfig {
  titulo?: string;
  texto?: string;
  imagenUrl?: string;
  videoUrl?: string;
  estilo?: SlideEstilo;
  kicker?: string; // etiqueta pequeña sobre el título (ej. "INTRODUCCIÓN"); fallback genérico si no viene
  iconoDecorativo?: string; // clase de ícono Tabler (ej. "ti-stairs") para el círculo decorativo; fallback por defecto si no viene
}

export interface OpcionSimple {
  id: string | number;
  texto: string;
  imagenUrl?: string;
}

export interface VerdaderoFalsoConfig {
  enunciado: string;
  imagenUrl?: string;
  estilo?: SlideEstilo;
  kicker?: string;
}

export interface OpcionMultipleConfig {
  enunciado: string;
  opciones: OpcionSimple[];
  estilo?: SlideEstilo;
  kicker?: string;
}

export interface MarcarImagenConfig {
  enunciado: string;
  imagenes: OpcionSimple[];
  estilo?: SlideEstilo;
  kicker?: string;
}

export interface ArrastrarItem {
  id: string;
  texto: string;
}
export interface ArrastrarZona {
  id: string;
  texto: string;
}
export interface ArrastrarSoltarConfig {
  enunciado: string;
  items: ArrastrarItem[];
  zonas: ArrastrarZona[];
  estilo?: SlideEstilo;
  kicker?: string;
}

export interface OrdenarConfig {
  enunciado: string;
  items: { id: string; texto: string }[];
  estilo?: SlideEstilo;
  kicker?: string;
}

// tipoCodigo: "contenido_tarjetas". No evaluable (modo_correccion: "sin_calificar").
// Grid de N tarjetas con imagen + texto corto; cada una despliega una descripción larga
// en un overlay al hacer clic. Reutilizable en cualquier curso (peligros, controles, etc.).
export interface TarjetaItem {
  id: string;
  titulo: string;
  texto: string;
  imagenUrl?: string;
  descripcion?: string; // texto largo mostrado en el overlay al expandir
}
export interface TarjetasConfig {
  titulo?: string;
  tarjetas: TarjetaItem[];
  estilo?: SlideEstilo;
  kicker?: string;
}

// tipoCodigo: "contenido_galeria_zoom". No evaluable (modo_correccion: "sin_calificar").
// Grid de imágenes; clic para ampliar a pantalla completa.
export interface GaleriaImagen {
  id: string;
  imagenUrl: string;
  caption?: string;
}
export interface GaleriaZoomConfig {
  titulo?: string;
  imagenes: GaleriaImagen[];
  estilo?: SlideEstilo;
  kicker?: string;
}

// tipoCodigo: "contenido_libre". No evaluable (modo_correccion: "sin_calificar").
// Lienzo libre: elementos posicionados a mano dentro de un canvas de tamaño fijo
// CANVAS_ANCHO x CANVAS_ALTO (ver canvas-editor.ts), que se escala responsive en el
// editor y en el player. x/y/ancho/alto están en píxeles de ese sistema de coordenadas.
export type ElementoTipo = 'texto' | 'imagen' | 'forma' | 'icono' | 'boton' | 'video';
export type AnimacionEntrada = 'ninguna' | 'fade' | 'slide-up' | 'slide-left' | 'zoom';
export type AnimacionEasing = 'ease' | 'ease-in' | 'ease-out' | 'linear' | 'bounce';
export type FormaTipo = 'rectangulo' | 'circulo';

// Overlay interactivo: al hacer clic sobre el elemento en el player, se muestra un
// panel encima con este contenido (mismo patrón que "¿Sabías que...?" / "Haz clic para
// explorar" de Genially). Es opcional — un elemento sin overlay se comporta como hoy.
export interface ElementoOverlay {
  activo: boolean;
  titulo?: string;
  texto?: string;
  imagenUrl?: string;
}

export interface ElementoLibre {
  id: string;
  tipo: ElementoTipo;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  rotacion?: number; // grados
  zIndex?: number;
  bloqueado?: boolean; // no se puede mover/redimensionar en el canvas hasta desbloquear
  animacionEntrada?: AnimacionEntrada;
  animacionDelayMs?: number;
  animacionDuracionMs?: number;
  animacionEasing?: AnimacionEasing;
  overlay?: ElementoOverlay;
  // Propiedades de texto
  texto?: string;
  colorTexto?: string;
  tamanoFuente?: number; // px
  alineacion?: 'left' | 'center' | 'right';
  negrita?: boolean;
  // Propiedades de imagen / video
  imagenUrl?: string;
  videoUrl?: string; // URL embebible (YouTube/Vimeo)
  bordeRedondeado?: number; // px
  // Propiedades de forma
  formaTipo?: FormaTipo;
  colorFondo?: string;
  // Propiedades de ícono (clase Tabler, ej. "ti-star")
  iconoClase?: string;
  // Propiedades de botón
  botonTexto?: string;
  botonUrl?: string; // navega/abre en nueva pestaña al hacer clic (si no tiene overlay)
}

export interface ContenidoLibreConfig {
  titulo?: string;
  elementos: ElementoLibre[];
  estilo?: SlideEstilo;
  kicker?: string;
}
