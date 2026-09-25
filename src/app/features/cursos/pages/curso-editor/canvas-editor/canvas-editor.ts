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
import { ElementoLibre, ElementoTipo } from '../../../dtos/curso.dtos';
import { CANVAS_ANCHO, CANVAS_ALTO } from '../../curso-player/slides/slide-contenido-libre/slide-contenido-libre';
import { IconoPicker } from './icono-picker/icono-picker';
import { TimelineAnimaciones } from './timeline-animaciones/timeline-animaciones';

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
};

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
  imports: [CommonModule, FormsModule, IconoPicker, TimelineAnimaciones],
  templateUrl: './canvas-editor.html',
  styleUrl: './canvas-editor.css',
})
export class CanvasEditor implements OnChanges, AfterViewInit, OnDestroy {
  readonly canvasAncho = CANVAS_ANCHO;
  readonly canvasAlto = CANVAS_ALTO;

  constructor(private cdr: ChangeDetectorRef) {}

  @Input() elementos: ElementoLibre[] = [];
  @Output() elementosChange = new EventEmitter<ElementoLibre[]>();

  /** Pide al padre subir una imagen para este elemento (el padre conoce el servicio de subida). */
  @Output() subirImagen = new EventEmitter<ElementoLibre>();

  @ViewChild('lienzo') private lienzoRef?: ElementRef<HTMLDivElement>;
  @ViewChild('lienzoEnvoltorio') private envoltorioRef?: ElementRef<HTMLDivElement>;

  // ---- Zoom: por defecto el lienzo se ajusta (escala) al espacio disponible sin
  // deformarse; el usuario puede fijar un zoom manual que ignora ese ajuste automático. ----
  private escalaAjuste = 1;
  private zoomManual: number | null = null;
  private resizeObserver?: ResizeObserver;
  private readonly MARGEN_ENVOLTORIO = 20; // padding visual alrededor del lienzo

  get escalaFinal(): number {
    return this.zoomManual ?? this.escalaAjuste;
  }

  get porcentajeZoom(): number {
    return Math.round(this.escalaFinal * 100);
  }

  zoomIn(): void {
    this.zoomManual = Math.min(2, Math.round((this.escalaFinal + 0.1) * 10) / 10);
  }

  zoomOut(): void {
    this.zoomManual = Math.max(0.2, Math.round((this.escalaFinal - 0.1) * 10) / 10);
  }

  zoomAjustar(): void {
    this.zoomManual = null;
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
    const enCampoDeTexto = ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName);
    if (enCampoDeTexto) return; // se deja el undo nativo del campo de texto

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

  private camposIniciales(tipo: ElementoTipo): Partial<ElementoLibre> {
    switch (tipo) {
      case 'texto':
        return { texto: 'Texto nuevo', colorTexto: '#14100b', tamanoFuente: 28, alineacion: 'left', negrita: false };
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

  toggleOverlay(activo: boolean): void {
    const el = this.seleccionado;
    if (!el) return;
    el.overlay = { ...(el.overlay || {}), activo };
    this.emitir();
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
