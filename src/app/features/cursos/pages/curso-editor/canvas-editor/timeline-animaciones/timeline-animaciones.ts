import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElementoLibre } from '../../../../dtos/curso.dtos';

const PASO_SNAP_MS = 50;
const DURACION_MINIMA_MS = 100;

@Component({
  selector: 'app-timeline-animaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline-animaciones.html',
  styleUrl: './timeline-animaciones.css',
})
export class TimelineAnimaciones {
  constructor(private cdr: ChangeDetectorRef) {}

  @Input() elementos: ElementoLibre[] = [];
  @Input() seleccionadoId: string | null = null;

  @Output() elementosChange = new EventEmitter<ElementoLibre[]>();
  @Output() seleccionar = new EventEmitter<string>();

  /** Colapsado por defecto: el lienzo debe ser lo dominante, la línea de tiempo es una
   *  herramienta ocasional, no algo que compita permanentemente por espacio vertical. */
  expandido = false;

  toggleExpandido(): void {
    this.expandido = !this.expandido;
  }

  @ViewChild('pista') private pistaRef?: ElementRef<HTMLDivElement>;

  private arrastrando: { el: ElementoLibre; modo: 'mover' | 'duracion'; origenX: number; origenDelay: number; origenDuracion: number } | null = null;

  /** Escala del ruler: ventana visible de tiempo, se expande si algún elemento la supera. */
  get escalaMs(): number {
    const maximo = this.elementos.reduce(
      (max, e) => Math.max(max, (e.animacionDelayMs ?? 0) + (e.animacionDuracionMs ?? 600)),
      0,
    );
    return Math.max(2000, Math.ceil((maximo + 500) / 500) * 500);
  }

  get marcasRuler(): number[] {
    const paso = this.escalaMs > 6000 ? 1000 : 500;
    const marcas: number[] = [];
    for (let t = 0; t <= this.escalaMs; t += paso) marcas.push(t);
    return marcas;
  }

  /** Filas ordenadas por delay (así el orden visual = orden real de aparición). */
  get filas(): ElementoLibre[] {
    return [...this.elementos]
      .filter((e) => (e.animacionEntrada ?? 'ninguna') !== 'ninguna')
      .sort((a, b) => (a.animacionDelayMs ?? 0) - (b.animacionDelayMs ?? 0));
  }

  etiqueta(el: ElementoLibre): string {
    switch (el.tipo) {
      case 'texto':
        return el.texto?.slice(0, 24) || 'Texto';
      case 'boton':
        return el.botonTexto || 'Botón';
      case 'icono':
        return el.iconoClase || 'Ícono';
      default:
        return el.tipo.charAt(0).toUpperCase() + el.tipo.slice(1);
    }
  }

  seleccionarFila(id: string): void {
    this.seleccionar.emit(id);
  }

  reordenarAntes(el: ElementoLibre): void {
    const filas = this.filas;
    const i = filas.findIndex((f) => f.id === el.id);
    if (i <= 0) return;
    const anterior = filas[i - 1];
    [el.animacionDelayMs, anterior.animacionDelayMs] = [anterior.animacionDelayMs, el.animacionDelayMs];
    this.emitir();
  }

  reordenarDespues(el: ElementoLibre): void {
    const filas = this.filas;
    const i = filas.findIndex((f) => f.id === el.id);
    if (i === -1 || i >= filas.length - 1) return;
    const siguiente = filas[i + 1];
    [el.animacionDelayMs, siguiente.animacionDelayMs] = [siguiente.animacionDelayMs, el.animacionDelayMs];
    this.emitir();
  }

  // ---- Arrastre de la barra: mover (cambia delay) o su borde derecho (cambia duración) ----

  iniciarArrastreBarra(el: ElementoLibre, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.seleccionar.emit(el.id);
    this.arrastrando = {
      el,
      modo: 'mover',
      origenX: event.clientX,
      origenDelay: el.animacionDelayMs ?? 0,
      origenDuracion: el.animacionDuracionMs ?? 600,
    };
    this.suscribir();
  }

  iniciarArrastreDuracion(el: ElementoLibre, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.seleccionar.emit(el.id);
    this.arrastrando = {
      el,
      modo: 'duracion',
      origenX: event.clientX,
      origenDelay: el.animacionDelayMs ?? 0,
      origenDuracion: el.animacionDuracionMs ?? 600,
    };
    this.suscribir();
  }

  private suscribir(): void {
    // App zoneless: window.addEventListener crudo no dispara refresco solo.
    const onMove = (e: PointerEvent) => {
      this.alMover(e);
      this.cdr.detectChanges();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.arrastrando = null;
      this.emitir();
      this.cdr.detectChanges();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private alMover(event: PointerEvent): void {
    if (!this.arrastrando || !this.pistaRef) return;
    const anchoPista = this.pistaRef.nativeElement.getBoundingClientRect().width;
    const msPorPx = this.escalaMs / anchoPista;
    const deltaMs = (event.clientX - this.arrastrando.origenX) * msPorPx;
    const snap = (v: number) => Math.max(0, Math.round(v / PASO_SNAP_MS) * PASO_SNAP_MS);

    if (this.arrastrando.modo === 'mover') {
      this.arrastrando.el.animacionDelayMs = snap(this.arrastrando.origenDelay + deltaMs);
    } else {
      this.arrastrando.el.animacionDuracionMs = Math.max(
        DURACION_MINIMA_MS,
        snap(this.arrastrando.origenDuracion + deltaMs),
      );
    }
  }

  private emitir(): void {
    this.elementosChange.emit(this.elementos);
  }
}
