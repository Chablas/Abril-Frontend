import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { ArchivoSalidasService } from '../../services/archivo-salidas.service';

/** pdf.js (build UMD), cargado global desde index.html. */
declare const pdfjsLib: any;

type TipoArchivo = 'pdf' | 'imagen' | 'otro';

const EXT_IMAGEN = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];

/**
 * Un archivo del módulo a la vista: su etiqueta, el enlace a SharePoint y, debajo, el archivo
 * mismo —el PDF dibujado hoja por hoja, o la imagen—. Es lo que muestran los modales de las siete
 * pantallas de salidas en lugar de un enlace suelto.
 *
 * El archivo lo trae el backend (`ArchivoSalidasService`) y no el navegador desde SharePoint: el
 * webUrl no se puede leer desde otra página (CORS y sesión de Microsoft 365). Se pide recién cuando
 * el marco se acerca a la vista, así un modal con varios documentos no los baja todos de golpe.
 *
 * Con `soloEnlace` queda la etiqueta y el enlace, sin el archivo (ni se baja): lo usan las
 * planillas de gasto, cuyo contenido ya está en la tabla de salidas que va junto a ellas. La
 * planilla grupal, el Consolidado del S10 y los adjuntos siguen a la vista.
 */
@Component({
  standalone: true,
  selector: 'app-documento-embebido',
  imports: [CommonModule],
  templateUrl: './documento-embebido.html',
  styleUrl: './documento-embebido.css',
})
export class DocumentoEmbebido implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) etiqueta!: string;
  /** Texto del enlace. Sin él, el nombre del archivo que trae la URL. */
  @Input() nombre: string | null = null;
  /** webUrl de SharePoint: el enlace abre el archivo ahí, y es con lo que se pide al backend. */
  @Input({ required: true }) url!: string;
  /** true = copia firmada (ícono de check); false = el archivo tal cual. */
  @Input() firmado = false;
  /** Texto chico al lado de la etiqueta: una fecha, a qué más cubre. */
  @Input() nota: string | null = null;
  /** Marca de estado junto a la etiqueta ("Sin firma"). */
  @Input() marca: string | null = null;
  /**
   * true = solo la etiqueta y el enlace: el archivo no se muestra ni se baja. Es fijo por uso (no
   * se alterna en vivo): el marco directamente no se crea.
   */
  @Input() soloEnlace = false;

  // Dinámicos y no `static`: con `soloEnlace` el marco no existe.
  @ViewChild('marco') private marco?: ElementRef<HTMLElement>;
  @ViewChild('paginas') private paginas?: ElementRef<HTMLElement>;

  estado: 'cargando' | 'listo' | 'error' | 'sin-vista' = 'cargando';
  tipo: TipoArchivo = 'otro';
  /** Object URL de la imagen ya bajada. */
  imagenUrl: string | null = null;

  private sub?: Subscription;
  private observer?: IntersectionObserver;
  private visible = false;
  private pdf: any = null;
  /** Una carga que termina después de otra más nueva (o del cierre) no dibuja nada. */
  private carga = 0;

  constructor(
    private archivos: ArchivoSalidasService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  get nombreVisible(): string {
    if (this.nombre) return this.nombre;
    const archivo = (this.url ?? '').split(/[?#]/)[0].split('/').pop() ?? '';
    try {
      return decodeURIComponent(archivo) || 'Archivo';
    } catch {
      return archivo || 'Archivo';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['url'] || this.soloEnlace) return;
    this.tipo = this.tipoDe(this.url) ?? this.tipoDe(this.nombre) ?? 'otro';
    if (this.visible) {
      this.traer();
    } else {
      this.liberar();
      this.estado = this.tipo === 'otro' ? 'sin-vista' : 'cargando';
    }
  }

  ngAfterViewInit(): void {
    // Solo el enlace: no hay marco que observar ni archivo que traer.
    if (this.soloEnlace || !this.marco) return;

    if (typeof IntersectionObserver === 'undefined') {
      this.visible = true;
      this.traer();
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          this.observer?.disconnect();
          this.observer = undefined;
          this.zone.run(() => {
            this.visible = true;
            this.traer();
          });
        },
        { rootMargin: '400px 0px' },
      );
      this.observer.observe(this.marco!.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.carga++;
    this.observer?.disconnect();
    this.sub?.unsubscribe();
    this.liberar();
  }

  private traer(): void {
    const carga = ++this.carga;
    this.sub?.unsubscribe();
    this.liberar();

    if (this.tipo === 'otro') {
      this.estado = 'sin-vista';
      this.cdr.detectChanges();
      return;
    }

    this.estado = 'cargando';
    this.cdr.detectChanges();
    this.sub = this.archivos.getArchivo(this.url).subscribe({
      next: (blob) =>
        this.tipo === 'pdf'
          // Fuera de la zona: pdf.js encadena muchas tareas por hoja y cada una dispararía la
          // detección de cambios de toda la pantalla.
          ? this.zone.runOutsideAngular(() => this.dibujarPdf(blob, carga))
          : this.mostrarImagen(blob, carga),
      error: () => this.fallar(carga),
    });
  }

  private mostrarImagen(blob: Blob, carga: number): void {
    if (carga !== this.carga) return;
    this.imagenUrl = URL.createObjectURL(blob);
    this.estado = 'listo';
    this.cdr.detectChanges();
  }

  private async dibujarPdf(blob: Blob, carga: number): Promise<void> {
    try {
      if (typeof pdfjsLib === 'undefined') throw new Error('pdf.js no está cargado');
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }

      const datos = new Uint8Array(await blob.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: datos }).promise;
      if (carga !== this.carga) {
        pdf.destroy();
        return;
      }
      this.pdf = pdf;

      const ancho = this.anchoDisponible();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      for (let n = 1; n <= pdf.numPages; n++) {
        const hoja = await pdf.getPage(n);
        if (carga !== this.carga) return;

        // Tamaño real de la hoja (1 pt = 96/72 px) sin pasarse del ancho del marco; el lienzo se
        // dibuja a la densidad de la pantalla para que el texto no salga borroso.
        const base = hoja.getViewport({ scale: 1 });
        const cssAncho = Math.min(ancho, (base.width * 96) / 72);
        const viewport = hoja.getViewport({ scale: (cssAncho / base.width) * dpr });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        // En línea: el lienzo se crea fuera del template y el CSS del componente no le llega.
        canvas.style.cssText =
          `width:${cssAncho}px;max-width:100%;height:auto;display:block;background:#fff;` +
          'box-shadow:0 1px 3px rgba(0,0,0,0.08)';

        await hoja.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        if (carga !== this.carga) return;

        this.paginas?.nativeElement.appendChild(canvas);
        hoja.cleanup();

        // Se muestra apenas está la primera hoja; las demás se van sumando debajo.
        if (n === 1) {
          this.estado = 'listo';
          this.cdr.detectChanges();
        }
      }
    } catch {
      this.fallar(carga);
    }
  }

  /** Ancho útil del marco, sin su padding: es el tope de cada hoja. */
  private anchoDisponible(): number {
    const el = this.marco?.nativeElement;
    if (!el) return 900;
    const estilo = getComputedStyle(el);
    const ancho = el.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    return ancho > 0 ? ancho : 900;
  }

  private fallar(carga: number): void {
    if (carga !== this.carga) return;
    this.liberar();
    this.estado = 'error';
    this.cdr.detectChanges();
  }

  private liberar(): void {
    this.pdf?.destroy();
    this.pdf = null;
    if (this.imagenUrl) {
      URL.revokeObjectURL(this.imagenUrl);
      this.imagenUrl = null;
    }
    this.paginas?.nativeElement.replaceChildren();
  }

  /** Por la extensión: la del webUrl, o la del nombre si la URL no la trae. */
  private tipoDe(texto: string | null | undefined): TipoArchivo | null {
    const ruta = (texto ?? '').split(/[?#]/)[0];
    const punto = ruta.lastIndexOf('.');
    if (punto < 0 || punto < ruta.lastIndexOf('/')) return null;
    const ext = ruta.slice(punto + 1).toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (EXT_IMAGEN.includes(ext)) return 'imagen';
    return ext ? 'otro' : null;
  }
}
