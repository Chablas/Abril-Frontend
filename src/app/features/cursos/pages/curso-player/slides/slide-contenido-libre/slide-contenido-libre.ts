import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CursoSlideDto, ContenidoLibreConfig, ElementoLibre, PreguntaAccionItem } from '../../../../dtos/curso.dtos';
import { construirConfiguracionPlanaDesdePregunta } from '../../../../pregunta-config-builder';
import { cargarGoogleFont } from '../../../../google-font-loader';
import { SlideVerdaderoFalso } from '../slide-verdadero-falso/slide-verdadero-falso';
import { SlideOpcionMultiple } from '../slide-opcion-multiple/slide-opcion-multiple';
import { SlideEleccionMultiple } from '../slide-eleccion-multiple/slide-eleccion-multiple';
import { SlideOrdenar } from '../slide-ordenar/slide-ordenar';
import { SlideRespuestaCorta } from '../slide-respuesta-corta/slide-respuesta-corta';
import { SlideCompletarHuecos } from '../slide-completar-huecos/slide-completar-huecos';
import { SlideEmparejarConceptos } from '../slide-emparejar-conceptos/slide-emparejar-conceptos';
import { SlideDeslizaAcierta } from '../slide-desliza-acierta/slide-desliza-acierta';

// Tamaño fijo del sistema de coordenadas del lienzo libre (ver canvas-editor.ts).
export const CANVAS_ANCHO = 1280;
export const CANVAS_ALTO = 720;

@Component({
  selector: 'app-slide-contenido-libre',
  standalone: true,
  imports: [
    CommonModule,
    SlideVerdaderoFalso,
    SlideOpcionMultiple,
    SlideEleccionMultiple,
    SlideOrdenar,
    SlideRespuestaCorta,
    SlideCompletarHuecos,
    SlideEmparejarConceptos,
    SlideDeslizaAcierta,
  ],
  templateUrl: './slide-contenido-libre.html',
  styleUrls: ['./slide-contenido-libre.css', '../../../../cursos-cascada.css'],
})
export class SlideContenidoLibre implements AfterViewInit, OnDestroy {
  readonly canvasAncho = CANVAS_ANCHO;
  readonly canvasAlto = CANVAS_ALTO;

  @ViewChild('lienzo') private lienzoRef?: ElementRef<HTMLDivElement>;

  // El lienzo se escala por CSS (width: 100%, max-width) según el espacio disponible,
  // pero tamaños absolutos como el de fuente no escalan solos — sin esto, el mismo curso
  // se ve con proporciones distintas (texto que ajusta/corta diferente) según el ancho
  // real de pantalla. `escala` = ancho renderizado del lienzo / canvasAncho (1280).
  escala = 1;
  private resizeObserver?: ResizeObserver;

  /** Tamaño mínimo de letra en pantallas angostas (px reales, no de canvas): sin esto, un
   *  texto de 19px diseñado para un lienzo de 1280px se encoge proporcionalmente junto
   *  con todo lo demás al verse en un celular (~360px de ancho) y queda ilegible — un
   *  factor de escala de ~0.28 lo deja en ~5px. Prioriza que se pueda leer sobre que la
   *  caja de texto quede pixel-perfecta a su posición diseñada. */
  private static readonly TAMANO_FUENTE_MINIMO_PX = 13;

  fontSizePx(tamanoFuenteBase: number | undefined, factorAncho = 1): number {
    const base = (tamanoFuenteBase || 24) * factorAncho;
    return Math.max(SlideContenidoLibre.TAMANO_FUENTE_MINIMO_PX, base * this.escala);
  }

  private _slide!: CursoSlideDto;
  config: ContenidoLibreConfig = { elementos: [] };

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.overlayAbierto = null;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
      if (!this.config.elementos) this.config.elementos = [];
    } catch {
      this.config = { elementos: [] };
    }
    this.iniciarTemporizadorPregunta();
    // Kit de marca: los textos guardan la familia elegida en el editor (el.fontFamily) —
    // el reproductor real necesita cargar esa fuente de Google Fonts él mismo, nunca lo
    // hereda del navegador del autor.
    for (const fam of new Set(this.config.elementos.map((e) => e.fontFamily).filter(Boolean))) {
      cargarGoogleFont(fam);
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();
  /** El botón de un elemento apunta a otra slide del curso (botonAccion === 'pagina'). */
  @Output() irAPagina = new EventEmitter<number>();

  overlayAbierto: ElementoLibre | null = null;

  /** Overlay "modal" (default): panel centrado con fondo oscurecido a pantalla completa. */
  get overlayModal(): ElementoLibre | null {
    return this.overlayAbierto && this.overlayAbierto.overlay?.modo !== 'in-place' ? this.overlayAbierto : null;
  }
  /** Overlay "in-place": el contenido reemplaza al elemento en su propia posición dentro
   *  del lienzo (estilo tarjeta con ícono "i" que se expande) — ver overlay-en-sitio-*
   *  en el html/css. */
  get overlayEnSitio(): ElementoLibre | null {
    return this.overlayAbierto && this.overlayAbierto.overlay?.modo === 'in-place' ? this.overlayAbierto : null;
  }

  // ---- Carrusel (tipo 'carrusel', estilo Genially: franja de imágenes con flechas +
  // puntos, cantidad libre) — el índice "primera imagen visible" vive acá (por elemento,
  // no en el modelo) porque es puro estado de navegación de ESTE montaje, no algo que se
  // guarde con la slide. ----
  private carruselIndices = new Map<string, number>();

  carruselIndice(el: ElementoLibre): number {
    return this.carruselIndices.get(el.id) ?? 0;
  }

  carruselVisiblesEnPantalla(el: ElementoLibre): number {
    return Math.max(1, el.carruselVisibles ?? 3);
  }

  carruselPuedeAnterior(el: ElementoLibre): boolean {
    return this.carruselIndice(el) > 0;
  }

  carruselPuedeSiguiente(el: ElementoLibre): boolean {
    const total = el.carruselImagenes?.length ?? 0;
    return this.carruselIndice(el) < total - this.carruselVisiblesEnPantalla(el);
  }

  carruselMover(el: ElementoLibre, delta: -1 | 1, event: Event): void {
    event.stopPropagation();
    const total = el.carruselImagenes?.length ?? 0;
    const maxIndice = Math.max(0, total - this.carruselVisiblesEnPantalla(el));
    const actual = this.carruselIndice(el);
    const destino = Math.min(maxIndice, Math.max(0, actual + delta));
    this.carruselIndices.set(el.id, destino);
  }

  carruselIrA(el: ElementoLibre, indice: number, event: Event): void {
    event.stopPropagation();
    const total = el.carruselImagenes?.length ?? 0;
    const maxIndice = Math.max(0, total - this.carruselVisiblesEnPantalla(el));
    this.carruselIndices.set(el.id, Math.min(maxIndice, Math.max(0, indice)));
  }

  /** Un punto de paginación por imagen (no por "página" de N visibles) — igual que
   *  Genially, donde cada punto salta a esa imagen como primera visible. */
  carruselPuntos(el: ElementoLibre): number[] {
    const total = el.carruselImagenes?.length ?? 0;
    const maxIndice = Math.max(0, total - this.carruselVisiblesEnPantalla(el));
    return Array.from({ length: maxIndice + 1 }, (_, i) => i);
  }

  // ---- Punto interactivo (tipo 'hotspot', estilo Genially: círculo pulsante que muestra
  // un globo de texto anclado al hacer clic). A diferencia de `overlay`, NO es modal:
  // pueden quedar varios abiertos a la vez, por eso es un Set y no un solo campo. ----
  hotspotsAbiertos = new Set<string>();

  toggleHotspot(el: ElementoLibre, event: Event): void {
    event.stopPropagation();
    if (this.hotspotsAbiertos.has(el.id)) this.hotspotsAbiertos.delete(el.id);
    else this.hotspotsAbiertos.add(el.id);
  }

  // ---- Audio con miniatura (estilo Genially: foto + botón de altavoz/play centrado, en
  // vez de la barra <audio controls> nativa) — reproducción manual vía Audio() nativo,
  // sin tocar el DOM del <audio> nativo (ese sigue existiendo para audios sin miniatura). ----
  private audiosMiniatura = new Map<string, HTMLAudioElement>();
  audiosReproduciendo = new Set<string>();

  toggleAudioMiniatura(el: ElementoLibre, event: Event): void {
    event.stopPropagation();
    if (!el.audioUrl) return;
    let audio = this.audiosMiniatura.get(el.id);
    if (!audio) {
      audio = new Audio(el.audioUrl);
      audio.addEventListener('ended', () => {
        this.audiosReproduciendo.delete(el.id);
        this.cdr.detectChanges();
      });
      this.audiosMiniatura.set(el.id, audio);
    }
    if (this.audiosReproduciendo.has(el.id)) {
      audio.pause();
      this.audiosReproduciendo.delete(el.id);
    } else {
      audio.play().catch(() => {});
      this.audiosReproduciendo.add(el.id);
    }
  }

  // Animación de interacción (hover/clic): a diferencia de la de entrada (una vez, vía
  // CSS al montar), esta se repite cada vez que el usuario interactúa — se activa
  // agregando la clase por un instante y quitándola, para que un segundo hover/clic
  // pueda volver a dispararla (una clase que nunca se quita no reinicia la animación CSS).
  private elementosAnimando = new Set<string>();
  private timeoutsAnimacion = new Map<string, ReturnType<typeof setTimeout>>();
  private static readonly DURACION_ANIMACION_INTERACCION_MS = 700;

  // Animación de salida: el reproductor (CursoPlayer) llama a dispararSalida() y espera
  // a que resuelva antes de destruir esta slide y montar la siguiente.
  elementosSaliendo = new Set<string>();
  private static readonly DURACION_ANIMACION_SALIDA_MS = 480;

  // Temporizador de la pregunta embebida (pestaña Acciones > Temporizador, estilo Genially).
  tiempoRestanteSeg: number | null = null;
  mensajeTemporizadorMostrado: string | null = null;
  private intervaloTemporizador?: ReturnType<typeof setInterval>;
  private respondida = false;

  // Acciones de la rama Acierto/Error (pestaña Acciones, estilo Genially: lista apilada de
  // acciones). "Ir a página" la resuelve CursoPlayer (necesita cambiar de slide); el resto
  // se ejecuta acá porque necesita el DOM/estado de ESTE lienzo. Ver ejecutarAccionesPregunta.
  elementosOcultos = new Set<string>();
  private efectosForzados = new Map<string, string>();

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    if (!this.lienzoRef || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.recalcularEscala());
    this.resizeObserver.observe(this.lienzoRef.nativeElement);
    this.recalcularEscala();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    for (const t of this.timeoutsAnimacion.values()) clearTimeout(t);
    if (this.intervaloTemporizador) clearInterval(this.intervaloTemporizador);
    for (const audio of this.audiosMiniatura.values()) audio.pause();
  }

  private iniciarTemporizadorPregunta(): void {
    if (this.intervaloTemporizador) clearInterval(this.intervaloTemporizador);
    this.tiempoRestanteSeg = null;
    this.mensajeTemporizadorMostrado = null;
    this.respondida = false;

    const segundos = this.elementoPregunta?.preguntaTemporizadorSeg;
    if (!segundos || segundos <= 0) return;

    this.tiempoRestanteSeg = segundos;
    this.intervaloTemporizador = setInterval(() => {
      if (this.tiempoRestanteSeg === null) return;
      this.tiempoRestanteSeg--;
      if (this.tiempoRestanteSeg <= 0) {
        clearInterval(this.intervaloTemporizador);
        this.tiempoRestanteSeg = null;
        if (!this.respondida) {
          this.respondida = true;
          const accionesTemporizador = this.elementoPregunta?.preguntaAccionTemporizador?.acciones ?? [];
          if (accionesTemporizador.length) this.ejecutarAccionesPregunta(accionesTemporizador);

          const mensaje = this.elementoPregunta?.preguntaTemporizadorMensaje;
          if (mensaje) {
            this.mensajeTemporizadorMostrado = mensaje;
            this.cdr.detectChanges();
            setTimeout(() => this.respuesta.emit({ vencidoPorTemporizador: true }), 1500);
          } else {
            this.respuesta.emit({ vencidoPorTemporizador: true });
          }
        }
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private recalcularEscala(): void {
    if (!this.lienzoRef) return;
    const anchoRenderizado = this.lienzoRef.nativeElement.getBoundingClientRect().width;
    if (!anchoRenderizado) return;
    const nuevaEscala = anchoRenderizado / this.canvasAncho;
    if (Math.abs(nuevaEscala - this.escala) > 0.001) {
      this.escala = nuevaEscala;
      this.cdr.detectChanges();
    }
  }

  get elementosOrdenados(): ElementoLibre[] {
    return [...this.config.elementos].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  }

  /** Máximo una pregunta evaluable por pantalla (ver guardarSlide/agregarElementoPregunta).
   *  Cuando existe, oculta el botón "Continuar": la respuesta de la pregunta ES la
   *  respuesta de la pantalla completa (ver alResponderPregunta). */
  get elementoPregunta(): ElementoLibre | undefined {
    return this.config.elementos.find((e) => e.tipo === 'pregunta' && e.pregunta);
  }

  /** Reconstruye un CursoSlideDto descartable a partir de el.pregunta para pasárselo al
   *  mismo componente real que usa una pregunta de pantalla completa — nunca hay dos
   *  renderizadores distintos para la misma lógica de pregunta. */
  previewPreguntaSlide(el: ElementoLibre): CursoSlideDto {
    return {
      id: 0,
      cursoId: 0,
      orden: 0,
      tipoCodigo: el.pregunta!.tipoCodigo,
      esEvaluable: true,
      puntaje: el.pregunta!.puntaje,
      modoCorreccion: 'igualdad_exacta',
      configuracionJson: JSON.stringify(construirConfiguracionPlanaDesdePregunta(el.pregunta!, el)),
    };
  }

  /** La pregunta embebida emite su respuesta igual que si fuera pantalla completa — se
   *  reenvía tal cual, porque el backend compara contra la respuestaCorrecta que
   *  guardarSlide ya dejó al nivel raíz del configuracionJson de ESTA pantalla. */
  alResponderPregunta(respuesta: any): void {
    this.respondida = true;
    if (this.intervaloTemporizador) clearInterval(this.intervaloTemporizador);
    this.tiempoRestanteSeg = null;
    this.respuesta.emit(respuesta);
  }

  claseAnimacion(el: ElementoLibre): string {
    switch (el.animacionEntrada) {
      case 'fade':
      case 'aparecer':
        return 'anim-fade';
      case 'slide-up':
        return 'anim-slide-up';
      case 'slide-left':
        return 'anim-slide-left';
      case 'zoom':
        return 'anim-zoom';
      case 'enfocar':
        return 'anim-enfocar';
      case 'encender':
        return 'anim-encender';
      case 'deslizar':
        return 'anim-deslizar';
      case 'bote':
        return 'anim-bote';
      case 'remolino':
        return 'anim-remolino';
      case 'rotar':
        return 'anim-rotar';
      case 'rodar':
        return 'anim-rodar';
      default:
        // 'ninguna' (o sin animación asignada): sin esta clase el elemento se queda
        // invisible para siempre, porque `.libre-elemento` arranca en opacity:0 a la
        // espera de que una animación de entrada lo lleve a opacity:1 — sin animación
        // ninguna clase lo hacía, así que el elemento nunca aparecía.
        return 'anim-ninguna';
    }
  }

  /** Animación en bucle mientras la pantalla está visible ("Continuo" en Genially). Vive
   *  en un wrapper interno aparte (ver html) para no competir por la propiedad CSS
   *  `animation` con la de entrada/interacción, que están en el elemento contenedor. */
  claseContinua(el: ElementoLibre): string {
    if (!el.animacionContinua || el.animacionContinua === 'ninguna') return '';
    return 'continuo-' + el.animacionContinua;
  }

  claseSalida(el: ElementoLibre): string {
    if (!this.elementosSaliendo.has(el.id) || !el.animacionSalida || el.animacionSalida === 'ninguna') return '';
    return 'salida-' + el.animacionSalida;
  }

  /** Llamado por CursoPlayer antes de avanzar a la siguiente slide. Si ningún elemento
   *  tiene animación de salida configurada, resuelve de inmediato (sin esperar nada). */
  dispararSalida(): Promise<void> {
    const idsConSalida = this.config.elementos
      .filter((e) => e.animacionSalida && e.animacionSalida !== 'ninguna')
      .map((e) => e.id);
    if (!idsConSalida.length) return Promise.resolve();

    this.elementosSaliendo = new Set(idsConSalida);
    this.cdr.detectChanges();
    return new Promise((resolve) => {
      setTimeout(() => resolve(), SlideContenidoLibre.DURACION_ANIMACION_SALIDA_MS);
    });
  }

  easingCss(easing?: string): string {
    switch (easing) {
      case 'ease-in':
        return 'ease-in';
      case 'ease-out':
        return 'ease-out';
      case 'linear':
        return 'linear';
      case 'bounce':
        return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
      default:
        return 'ease';
    }
  }

  /** Estilo Genially: cualquier elemento puede tener una acción de clic (ir a página o
   *  abrir enlace), no solo el tipo 'boton' dedicado — ver alClicElemento. Un 'boton' sin
   *  botonAccion asume 'url' por compatibilidad con botones ya guardados; el resto de
   *  tipos no navega salvo que el autor lo haya configurado explícitamente. */
  esInteractivo(el: ElementoLibre): boolean {
    if (el.tipo === 'hotspot') return true;
    if (el.overlay?.activo) return true;
    const accion = el.tipo === 'boton' ? (el.botonAccion ?? 'url') : el.botonAccion;
    return accion === 'pagina' ? !!el.botonSlideId : accion === 'url' ? !!el.botonUrl : false;
  }

  claseAnimacionInteraccion(el: ElementoLibre): string {
    if (!this.elementosAnimando.has(el.id) || !el.animacionInteraccion) return '';
    return 'interaccion-' + el.animacionInteraccion.efecto;
  }

  claseEfectoForzado(el: ElementoLibre): string {
    const efecto = this.efectosForzados.get(el.id);
    return efecto ? 'interaccion-' + efecto : '';
  }

  /** Combina la clase de animación de entrada con la de interacción — un solo binding
   *  [ngClass] en el template para no chocar con class/ngClass múltiples en un elemento. */
  clasesAnimacion(el: ElementoLibre): string {
    return `${this.claseAnimacion(el)} ${this.claseAnimacionInteraccion(el)} ${this.claseSalida(el)} ${this.claseEfectoForzado(el)}`.trim();
  }

  /** Ejecuta las acciones de una rama Acierto/Error que apuntan a ESTE lienzo (todo menos
   *  "ir a página", que resuelve CursoPlayer). Se llama apenas llega la respuesta, para que
   *  audio/overlay/efecto tengan toda la ventana de feedback visibles antes de avanzar. */
  ejecutarAccionesPregunta(acciones: PreguntaAccionItem[]): void {
    for (const a of acciones) {
      switch (a.tipo) {
        case 'abrir_ventana':
          this.overlayAbierto = {
            id: 'accion-ventana',
            tipo: 'forma',
            x: 0,
            y: 0,
            ancho: 0,
            alto: 0,
            overlay: { activo: true, titulo: a.titulo, texto: a.texto, imagenUrl: a.imagenUrl },
          } as ElementoLibre;
          break;
        case 'audio':
          if (a.audioUrl) new Audio(a.audioUrl).play().catch(() => {});
          break;
        case 'mostrar_elemento':
          if (a.elementoId) this.elementosOcultos.delete(a.elementoId);
          break;
        case 'ocultar_elemento':
          if (a.elementoId) this.elementosOcultos.add(a.elementoId);
          break;
        case 'scroll_elemento':
          if (a.elementoId) {
            const nodo = this.lienzoRef?.nativeElement.querySelector(`[data-elemento-id="${a.elementoId}"]`);
            nodo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          break;
        case 'efecto':
          if (a.elementoId && a.efecto && a.efecto !== 'ninguna') {
            this.efectosForzados.set(a.elementoId, a.efecto);
            setTimeout(() => {
              this.efectosForzados.delete(a.elementoId!);
              this.cdr.detectChanges();
            }, SlideContenidoLibre.DURACION_ANIMACION_INTERACCION_MS);
          }
          break;
      }
    }
    this.cdr.detectChanges();
  }

  alPasarMouseElemento(el: ElementoLibre): void {
    if (el.animacionInteraccion?.disparador === 'hover') this.dispararAnimacionInteraccion(el);
  }

  private dispararAnimacionInteraccion(el: ElementoLibre): void {
    const timeoutPrevio = this.timeoutsAnimacion.get(el.id);
    if (timeoutPrevio) clearTimeout(timeoutPrevio);
    // Se quita y se vuelve a poner en el siguiente frame para reiniciar la animación CSS
    // aunque el usuario dispare el mismo efecto dos veces seguidas.
    this.elementosAnimando.delete(el.id);
    this.cdr.detectChanges();
    requestAnimationFrame(() => {
      this.elementosAnimando.add(el.id);
      this.cdr.detectChanges();
      const t = setTimeout(() => {
        this.elementosAnimando.delete(el.id);
        this.timeoutsAnimacion.delete(el.id);
        this.cdr.detectChanges();
      }, SlideContenidoLibre.DURACION_ANIMACION_INTERACCION_MS);
      this.timeoutsAnimacion.set(el.id, t);
    });
  }

  alClicElemento(el: ElementoLibre, event?: Event): void {
    if (el.animacionInteraccion?.disparador === 'clic') this.dispararAnimacionInteraccion(el);
    if (el.tipo === 'hotspot') {
      this.toggleHotspot(el, event ?? new Event('click'));
      return;
    }
    if (el.overlay?.activo) {
      this.overlayAbierto = el;
      return;
    }
    const accion = el.tipo === 'boton' ? (el.botonAccion ?? 'url') : el.botonAccion;
    if (accion === 'pagina') {
      if (el.botonSlideId) this.irAPagina.emit(el.botonSlideId);
    } else if (accion === 'url' && el.botonUrl) {
      window.open(el.botonUrl, '_blank', 'noopener');
    }
  }

  cerrarOverlay(): void {
    this.overlayAbierto = null;
  }

  urlVideoEmbebido(url: string | undefined): SafeResourceUrl {
    let final = '';
    if (url) {
      const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
      const vimeo = url.match(/vimeo\.com\/(\d+)/);
      final = youtube
        ? `https://www.youtube.com/embed/${youtube[1]}`
        : vimeo
          ? `https://player.vimeo.com/video/${vimeo[1]}`
          : url;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(final);
  }

  siguiente(): void {
    this.respuesta.emit({ visto: true });
  }
}
