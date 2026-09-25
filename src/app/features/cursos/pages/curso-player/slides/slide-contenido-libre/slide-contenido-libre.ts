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

// Tamaño fijo del sistema de coordenadas del lienzo libre (ver canvas-editor.ts).
export const CANVAS_ANCHO = 1280;
export const CANVAS_ALTO = 720;

@Component({
  selector: 'app-slide-contenido-libre',
  standalone: true,
  imports: [CommonModule],
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

  overlayAbierto: ElementoLibre | null = null;

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

  claseAnimacion(el: ElementoLibre): string {
    switch (el.animacionEntrada) {
      case 'fade':
        return 'anim-fade';
      case 'slide-up':
        return 'anim-slide-up';
      case 'slide-left':
        return 'anim-slide-left';
      case 'zoom':
        return 'anim-zoom';
      default:
        return '';
    }
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
    return !!el.overlay?.activo || (el.tipo === 'boton' && !!el.botonUrl);
  }

  alClicElemento(el: ElementoLibre): void {
    if (el.overlay?.activo) {
      this.overlayAbierto = el;
      return;
    }
    if (el.tipo === 'boton' && el.botonUrl) {
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
