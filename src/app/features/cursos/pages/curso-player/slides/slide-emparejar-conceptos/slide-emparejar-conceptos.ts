import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, EmparejarConceptosConfig } from '../../../../dtos/curso.dtos';

interface LineaPareja {
  izquierdaId: string;
  derechaId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  correcta: boolean | null; // null = todavía no validado
}

/** Emparejar conceptos, estilo Genially: clic en un concepto de la izquierda, clic en uno
 *  de la derecha, se traza una línea entre ambos (SVG superpuesto). Reemplaza el select
 *  por fila anterior — mismo modelo de datos (config.izquierda/derecha/respuestaCorrecta),
 *  solo cambia la interacción. */
@Component({
  selector: 'app-slide-emparejar-conceptos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-emparejar-conceptos.html',
  styleUrls: ['./slide-emparejar-conceptos.css', '../../../../cursos-cascada.css'],
})
export class SlideEmparejarConceptos implements AfterViewInit, OnDestroy {
  private _slide!: CursoSlideDto;
  config: EmparejarConceptosConfig = { enunciado: '', izquierda: [], derecha: [], respuestaCorrecta: {} };
  /** id de la izquierda -> id elegido de la derecha (o '' si aún no elige). */
  selecciones: Record<string, string> = {};
  confirmado = false;
  seleccionPendiente: { lado: 'izquierda' | 'derecha'; id: string } | null = null;
  lineas: LineaPareja[] = [];

  @ViewChild('contenedor') private contenedorRef?: ElementRef<HTMLDivElement>;
  private resizeObserver?: ResizeObserver;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.confirmado = false;
    this.seleccionPendiente = null;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', izquierda: [], derecha: [], respuestaCorrecta: {} };
    }
    this.selecciones = {};
    for (const izq of this.config.izquierda) this.selecciones[izq.id] = '';
    // El contenedor recién se pinta después de este setter — recalcula en el próximo frame.
    setTimeout(() => this.recalcularLineas());
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();
  @Input() estilo: 'oscuro' | 'claro' | 'adaptado-oscuro' | 'adaptado-claro' = 'claro';

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    if (!this.contenedorRef || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.recalcularLineas());
    this.resizeObserver.observe(this.contenedorRef.nativeElement);
    this.recalcularLineas();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  get kicker(): string {
    return this.config.kicker || 'EMPAREJAR CONCEPTOS';
  }

  get faltanSelecciones(): boolean {
    return this.config.izquierda.some((izq) => !this.selecciones[izq.id]);
  }

  /** Clic en una píldora, de cualquiera de los dos lados. Si ya hay una pendiente del lado
   *  contrario, se completa la pareja; si es del mismo lado, reemplaza la selección
   *  pendiente (permite arrepentirse antes de elegir el otro lado). */
  elegirConcepto(lado: 'izquierda' | 'derecha', id: string): void {
    if (this.confirmado) return;

    if (!this.seleccionPendiente) {
      this.seleccionPendiente = { lado, id };
      return;
    }

    if (this.seleccionPendiente.lado === lado) {
      this.seleccionPendiente = this.seleccionPendiente.id === id ? null : { lado, id };
      return;
    }

    const izquierdaId = lado === 'izquierda' ? id : this.seleccionPendiente.id;
    const derechaId = lado === 'derecha' ? id : this.seleccionPendiente.id;
    this.selecciones[izquierdaId] = derechaId;
    this.seleccionPendiente = null;
    this.recalcularLineas();
  }

  /** Quita la pareja de este concepto (clic en una píldora ya emparejada, sin pendiente). */
  quitarPareja(izquierdaId: string): void {
    if (this.confirmado || !this.selecciones[izquierdaId]) return;
    this.selecciones[izquierdaId] = '';
    this.recalcularLineas();
  }

  alClicPildora(lado: 'izquierda' | 'derecha', id: string): void {
    if (!this.seleccionPendiente) {
      const izquierdaId = lado === 'izquierda' ? (this.selecciones[id] ? id : null) : (this.izquierdaIdDe(id) ?? null);
      if (izquierdaId) {
        this.quitarPareja(izquierdaId);
        return;
      }
    }
    this.elegirConcepto(lado, id);
  }

  derechaIdDe(izquierdaId: string): string | undefined {
    return this.selecciones[izquierdaId] || undefined;
  }

  private izquierdaIdDe(derechaId: string): string | undefined {
    return Object.keys(this.selecciones).find((k) => this.selecciones[k] === derechaId);
  }

  derechaEmparejada(derechaId: string): boolean {
    return Object.values(this.selecciones).includes(derechaId);
  }

  derechaCorrecta(derechaId: string): boolean {
    if (!this.confirmado) return false;
    const izq = this.izquierdaIdDe(derechaId);
    return !!izq && this.config.respuestaCorrecta[izq] === derechaId;
  }

  derechaIncorrecta(derechaId: string): boolean {
    if (!this.confirmado) return false;
    const izq = this.izquierdaIdDe(derechaId);
    return !!izq && this.config.respuestaCorrecta[izq] !== derechaId;
  }

  private recalcularLineas(): void {
    const contenedor = this.contenedorRef?.nativeElement;
    if (!contenedor) return;
    const baseRect = contenedor.getBoundingClientRect();

    const nuevas: LineaPareja[] = [];
    for (const izq of this.config.izquierda) {
      const derechaId = this.selecciones[izq.id];
      if (!derechaId) continue;
      const nodoIzq = contenedor.querySelector<HTMLElement>(`[data-concepto="izquierda-${izq.id}"]`);
      const nodoDer = contenedor.querySelector<HTMLElement>(`[data-concepto="derecha-${derechaId}"]`);
      if (!nodoIzq || !nodoDer) continue;
      const rectIzq = nodoIzq.getBoundingClientRect();
      const rectDer = nodoDer.getBoundingClientRect();

      let correcta: boolean | null = null;
      if (this.confirmado) correcta = this.config.respuestaCorrecta[izq.id] === derechaId;

      nuevas.push({
        izquierdaId: izq.id,
        derechaId,
        x1: rectIzq.right - baseRect.left,
        y1: rectIzq.top + rectIzq.height / 2 - baseRect.top,
        x2: rectDer.left - baseRect.left,
        y2: rectDer.top + rectDer.height / 2 - baseRect.top,
        correcta,
      });
    }
    this.lineas = nuevas;
    this.cdr.detectChanges();
  }

  confirmar(): void {
    if (this.confirmado || this.faltanSelecciones) return;
    this.confirmado = true;
    this.recalcularLineas();
    this.respuesta.emit({ ...this.selecciones });
  }
}
