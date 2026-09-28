import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, DeslizaAciertaConfig } from '../../../../dtos/curso.dtos';

interface ResultadoTarjeta {
  texto: string;
  eligioVerdadero: boolean;
  correcta: boolean;
}

/** "Desliza y acierta", estilo Genially: un MAZO de varias tarjetas (no una sola
 *  afirmación) — el alumno arrastra cada una a la izquierda (Falso) o derecha (Verdadero),
 *  o usa los botones ✗/✓. Al terminar el mazo muestra su propia pantalla de resultados
 *  (aciertos/total, detalle por tarjeta) antes de emitir la respuesta final — recién ahí
 *  entra el flujo normal de CursoPlayer (feedback global, Acciones "Al superar/no superar
 *  la actividad", avanzar). */
@Component({
  selector: 'app-slide-desliza-acierta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-desliza-acierta.html',
  styleUrls: ['./slide-desliza-acierta.css', '../../../../cursos-cascada.css'],
})
export class SlideDeslizaAcierta {
  private _slide!: CursoSlideDto;
  config: DeslizaAciertaConfig = { tarjetas: [], respuestaCorrecta: { valores: [] } };

  fase: 'jugando' | 'resultado' = 'jugando';
  indice = 0;
  respuestas: boolean[] = [];
  resultados: ResultadoTarjeta[] = [];

  /** Feedback breve (✓/✗ grande) tras cada swipe, antes de pasar a la siguiente tarjeta. */
  feedbackTarjeta: 'correcto' | 'incorrecto' | null = null;

  // Estado del arrastre en curso (para el transform de la tarjeta activa).
  arrastrando = false;
  arrastreX = 0;
  private inicioArrastreX = 0;
  private static readonly UMBRAL_SWIPE_PX = 90;

  @ViewChild('tarjetaActiva') private tarjetaActivaRef?: ElementRef<HTMLDivElement>;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.fase = 'jugando';
    this.indice = 0;
    this.respuestas = [];
    this.resultados = [];
    this.feedbackTarjeta = null;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { tarjetas: [], respuestaCorrecta: { valores: [] } };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'DESLIZA Y ACIERTA';
  }

  get tarjetaActual() {
    return this.config.tarjetas[this.indice];
  }

  get progresoTexto(): string {
    return `${this.indice + 1}/${this.config.tarjetas.length}`;
  }

  get progresoPct(): number {
    return (this.indice / this.config.tarjetas.length) * 100;
  }

  get aciertos(): number {
    return this.resultados.filter((r) => r.correcta).length;
  }

  get superoActividad(): boolean {
    const umbral = this.config.umbralAprobarPct ?? 100;
    return (this.aciertos / this.config.tarjetas.length) * 100 >= umbral;
  }

  // ---- Interacción por botones ✗/✓ ----

  elegir(valor: boolean): void {
    if (this.feedbackTarjeta) return; // ya está resolviendo esta tarjeta
    const correcta = (this.config.respuestaCorrecta.valores[this.indice] ?? null) === valor;
    this.respuestas.push(valor);
    this.resultados.push({ texto: this.tarjetaActual.texto, eligioVerdadero: valor, correcta });
    this.feedbackTarjeta = correcta ? 'correcto' : 'incorrecto';

    setTimeout(() => {
      this.feedbackTarjeta = null;
      this.arrastreX = 0;
      if (this.indice + 1 >= this.config.tarjetas.length) {
        this.fase = 'resultado';
      } else {
        this.indice++;
      }
    }, 550);
  }

  // ---- Interacción por arrastre (swipe real, estilo Genially) ----

  alPointerDown(event: PointerEvent): void {
    if (this.feedbackTarjeta) return;
    this.arrastrando = true;
    this.inicioArrastreX = event.clientX;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  alPointerMove(event: PointerEvent): void {
    if (!this.arrastrando) return;
    this.arrastreX = event.clientX - this.inicioArrastreX;
  }

  alPointerUp(): void {
    if (!this.arrastrando) return;
    this.arrastrando = false;
    if (Math.abs(this.arrastreX) >= SlideDeslizaAcierta.UMBRAL_SWIPE_PX) {
      this.elegir(this.arrastreX > 0);
    } else {
      this.arrastreX = 0;
    }
  }

  get transformTarjeta(): string {
    if (!this.arrastreX) return '';
    const rotacion = this.arrastreX / 20;
    return `translateX(${this.arrastreX}px) rotate(${rotacion}deg)`;
  }

  confirmarResultado(): void {
    this.respuesta.emit({ valores: this.respuestas });
  }
}
