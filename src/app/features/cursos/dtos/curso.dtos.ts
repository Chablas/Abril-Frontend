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
  logoUrl?: string | null;
}

export interface CursoSlideDto {
  id: number;
  cursoId: number;
  orden: number;
  tipoCodigo: string;
  esEvaluable: boolean;
  puntaje?: number | null;
  /** false = "solo práctica": sigue mostrando acierto/error, pero no suma a la nota final. */
  contarParaNota?: boolean;
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
  logoUrl?: string | null;
}

/** Entrada del banco de preguntas reutilizable entre cursos — elegirla CLONA su
 *  configuracionJson dentro de una nueva CursoSlide; no queda enlazada al original. */
export interface CursoPreguntaBancoDto {
  id: number;
  tipoCodigo: string;
  titulo: string;
  categoria?: string | null;
  puntajeSugerido?: number | null;
  configuracionJson: string;
}

export interface CursoPreguntaBancoUpsertDto {
  tipoCodigo: string;
  titulo: string;
  categoria?: string | null;
  puntajeSugerido?: number | null;
  configuracionJson: string;
}

export interface CursoSlideUpsertDto {
  orden: number;
  tipoCodigo: string;
  esEvaluable: boolean;
  puntaje?: number | null;
  contarParaNota?: boolean;
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

// tipoCodigo: "pregunta_eleccion_multiple" — a diferencia de "pregunta_opcion_multiple"
// (una sola correcta), aquí puede haber VARIAS opciones correctas a la vez (checkboxes).
// respuestaCorrecta.opcionIds va en el MISMO orden que `opciones` (no el orden en que el
// alumno las marcó) para que la igualdad exacta de JSON sea determinística — el player
// arma su respuesta filtrando `opciones` en ese mismo orden, nunca por orden de clic.
export interface EleccionMultipleConfig {
  enunciado: string;
  opciones: OpcionSimple[];
  respuestaCorrecta: { opcionIds: (string | number)[] };
  estilo?: SlideEstilo;
  kicker?: string;
}

// tipoCodigo: "pregunta_desliza_acierta" — mismo modelo que Verdadero/Falso (una
// afirmación, correcta = sí/no) pero con otra piel: tarjeta con imagen y botones ✗/✓
// estilo "swipe" (Genially), en vez de dos botones de texto.
export interface DeslizaAciertaConfig {
  enunciado: string;
  imagenUrl?: string;
  respuestaCorrecta: { valor: boolean };
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

// tipoCodigo: "pregunta_respuesta_corta". Evaluable, modo_correccion: "igualdad_exacta".
// OJO: la corrección genérica del backend (CorregirGenerico) compara el ConfiguracionJson
// completo bajo la clave "respuestaCorrecta" contra el ENTERO objeto RespuestaJson que
// emite el player — por eso respuestaCorrecta va envuelto como { texto: "..." }, igual
// forma que emite el player, y no como un string suelto. Para tolerar variantes de
// escritura ("fotosíntesis" vs "fotosintesis"), el frontend normaliza (trim/minúsculas/sin
// tildes) lo que escribió el usuario contra respuestaCorrecta.texto y variantesAceptadas,
// y si coincide emite el valor CANÓNICO para que el backend lo reconozca; si no, emite lo
// que el usuario realmente escribió (para la evidencia/auditoría).
export interface RespuestaCortaConfig {
  enunciado: string;
  respuestaCorrecta: { texto: string };
  variantesAceptadas?: string[];
  estilo?: SlideEstilo;
  kicker?: string;
}

// tipoCodigo: "pregunta_completar_huecos". Mismo patrón de normalización y misma razón de
// envolver la respuesta ({ textos: [...] }, un elemento por hueco en orden) que respuesta
// corta. `texto` usa "___" (tres guiones bajos) como marcador de cada hueco, en orden.
export interface CompletarHuecosConfig {
  texto: string;
  respuestaCorrecta: { textos: string[] };
  variantesAceptadas?: (string[] | undefined)[];
  estilo?: SlideEstilo;
  kicker?: string;
}

// tipoCodigo: "pregunta_emparejar". Evaluable, modo_correccion: "igualdad_exacta" — a
// diferencia de los dos anteriores, aquí SÍ se emite el mapa {idIzquierda: idDerecha} tal
// cual, sin envolver en otra clave, porque ambos lados ya son objetos planos comparables
// directo. Se califica todo-o-nada (un solo par mal emparejado invalida la pregunta).
export interface EmparejarConceptosConfig {
  enunciado: string;
  izquierda: { id: string; texto: string }[];
  derecha: { id: string; texto: string }[];
  respuestaCorrecta: Record<string, string>;
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
export type ElementoTipo = 'texto' | 'imagen' | 'forma' | 'icono' | 'boton' | 'video' | 'audio' | 'pregunta';
// Un solo catálogo de efectos, compartido por Entrada / Continuo / Interactiva (estilo
// Genially: la galería de efectos es la misma sin importar el disparador, solo cambia
// cuándo se dispara). 'fade'/'slide-up'/'slide-left' se conservan solo por compatibilidad
// con slides ya guardadas — el picker nuevo ya no los ofrece, usa 'aparecer'/'deslizar'.
export type EfectoAnimacion =
  | 'ninguna'
  | 'fade'
  | 'slide-up'
  | 'slide-left'
  | 'aparecer'
  | 'enfocar'
  | 'zoom'
  | 'encender'
  | 'deslizar'
  | 'bote'
  | 'remolino'
  | 'rotar'
  | 'rodar';
export type AnimacionEntrada = EfectoAnimacion;
export type EfectoInteraccion = EfectoAnimacion;
export type AnimacionEasing = 'ease' | 'ease-in' | 'ease-out' | 'linear' | 'bounce';
export type FormaTipo = 'rectangulo' | 'circulo';

// Animación de interacción (estilo Genially: "Ratón encima" / "Hacer clic" + galería de
// efectos) — a diferencia de animacionEntrada (automática, una vez, al mostrarse la
// pantalla), esta se dispara por acción del usuario y puede repetirse cada vez que
// vuelve a pasar el mouse o hace clic. Convive con overlay/botonAccion: no los reemplaza,
// solo agrega el efecto visual antes/junto a esa acción.
export type DisparadorInteraccion = 'hover' | 'clic';

export interface AnimacionInteraccion {
  disparador: DisparadorInteraccion;
  efecto: EfectoInteraccion;
}

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
  animacionInteraccion?: AnimacionInteraccion | null;
  /** Animación que se repite en bucle mientras la pantalla está visible (Genially: "Continuo"). */
  animacionContinua?: EfectoAnimacion;
  /** Animación al salir de la pantalla (Genially: "Salida") — el reproductor espera a que
   *  termine antes de avanzar realmente a la siguiente slide. Ver CursoPlayer.avanzar(). */
  animacionSalida?: EfectoAnimacion;
  // Propiedades de texto
  texto?: string;
  colorTexto?: string;
  tamanoFuente?: number; // px
  alineacion?: 'left' | 'center' | 'right';
  negrita?: boolean;
  // Propiedades de imagen / video
  imagenUrl?: string;
  videoUrl?: string; // URL embebible (YouTube/Vimeo)
  audioUrl?: string; // archivo subido (mp3/ogg/wav) — locuciones, efectos, etc.
  audioAutoplay?: boolean; // reproduce solo al entrar a la pantalla (default false)
  bordeRedondeado?: number; // px
  // Propiedades de forma
  formaTipo?: FormaTipo;
  colorFondo?: string;
  // Propiedades de ícono (clase Tabler, ej. "ti-star")
  iconoClase?: string;
  // Propiedades de botón
  botonTexto?: string;
  botonAccion?: 'url' | 'pagina'; // default 'url' (compatibilidad con botones ya guardados)
  botonUrl?: string; // navega/abre en nueva pestaña al hacer clic (si botonAccion es 'url' y no hay overlay)
  botonSlideId?: number | null; // id de otra CursoSlide del mismo curso, si botonAccion es 'pagina'
  // Propiedades de pregunta evaluable embebida (tipo 'pregunta', estilo Genially: la
  // pregunta convive con el resto del lienzo libre en la misma pantalla). Solo se permite
  // UNA por pantalla — ver notas en curso-editor.ts (guardarSlide) y CorregirGenerico en
  // el backend, que asumen una sola respuestaCorrecta por CursoSlide.
  pregunta?: ElementoPreguntaConfig;
}

/** Mismos campos editables que preguntaEditando en curso-editor.ts — se reutiliza tal
 *  cual para no duplicar otro modelo. OJO seguridad: a diferencia de una pregunta como
 *  pantalla separada (donde el backend nunca envía la respuesta correcta al reproductor),
 *  aquí vive dentro de "elementos", que SÍ viaja completo al reproductor real — la
 *  respuesta correcta queda visible en el HTML/JSON servido (ver aviso en el chat). */
export interface ElementoPreguntaConfig {
  tipoCodigo: string; // uno de TIPOS_EVALUABLES (curso-editor.ts)
  puntaje: number;
  contarParaNota: boolean;
  kicker?: string;
  enunciado: string;
  imagenUrl?: string;
  opciones: (OpcionSimple & { correcta?: boolean })[];
  items: { id: string; texto: string }[];
  respuestaTexto: string;
  variantes: string;
  textoHuecos: string;
  respuestasHuecos: string[];
  izquierda: { id: string; texto: string }[];
  derecha: { id: string; texto: string }[];
  parejas: Record<string, string>;
}

export interface ContenidoLibreConfig {
  titulo?: string;
  elementos: ElementoLibre[];
  estilo?: SlideEstilo;
  kicker?: string;
}
