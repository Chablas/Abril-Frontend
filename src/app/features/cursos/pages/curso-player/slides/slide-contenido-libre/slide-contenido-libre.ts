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
import { CursoSlideDto, ContenidoLibreConfig, ElementoLibre } from '../../../../dtos/curso.dtos';
import { construirConfiguracionPlanaDesdePregunta } from '../../../../pregunta-config-builder';
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
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();
  /** El botón de un elemento apunta a otra slide del curso (botonAccion === 'pagina'). */
  @Output() irAPagina = new EventEmitter<number>();

  overlayAbierto: ElementoLibre | null = null;

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
      configuracionJson: JSON.stringify(construirConfiguracionPlanaDesdePregunta(el.pregunta!)),
    };
  }

  /** La pregunta embebida emite su respuesta igual que si fuera pantalla completa — se
   *  reenvía tal cual, porque el backend compara contra la respuestaCorrecta que
   *  guardarSlide ya dejó al nivel raíz del configuracionJson de ESTA pantalla. */
  alResponderPregunta(respuesta: any): void {
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
        return '';
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

  esInteractivo(el: ElementoLibre): boolean {
    return (
      !!el.overlay?.activo ||
      (el.tipo === 'boton' && ((el.botonAccion ?? 'url') === 'pagina' ? !!el.botonSlideId : !!el.botonUrl))
    );
  }

  claseAnimacionInteraccion(el: ElementoLibre): string {
    if (!this.elementosAnimando.has(el.id) || !el.animacionInteraccion) return '';
    return 'interaccion-' + el.animacionInteraccion.efecto;
  }

  /** Combina la clase de animación de entrada con la de interacción — un solo binding
   *  [ngClass] en el template para no chocar con class/ngClass múltiples en un elemento. */
  clasesAnimacion(el: ElementoLibre): string {
    return `${this.claseAnimacion(el)} ${this.claseAnimacionInteraccion(el)} ${this.claseSalida(el)}`.trim();
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

  alClicElemento(el: ElementoLibre): void {
    if (el.animacionInteraccion?.disparador === 'clic') this.dispararAnimacionInteraccion(el);
    if (el.overlay?.activo) {
      this.overlayAbierto = el;
      return;
    }
    if (el.tipo !== 'boton') return;
    if ((el.botonAccion ?? 'url') === 'pagina') {
      if (el.botonSlideId) this.irAPagina.emit(el.botonSlideId);
    } else if (el.botonUrl) {
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
