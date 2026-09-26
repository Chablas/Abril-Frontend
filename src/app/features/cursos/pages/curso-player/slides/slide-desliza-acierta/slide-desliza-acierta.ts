import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, DeslizaAciertaConfig } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-desliza-acierta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-desliza-acierta.html',
  styleUrls: ['./slide-desliza-acierta.css', '../../../../cursos-cascada.css'],
})
export class SlideDeslizaAcierta {
  private _slide!: CursoSlideDto;
  config: DeslizaAciertaConfig = { enunciado: '', respuestaCorrecta: { valor: true } };
  /** Qué botón presionó el usuario (✗ o ✓) — no si acertó o no, eso lo decide el backend. */
  elegido: 'si' | 'no' | null = null;
  confirmado = false;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.elegido = null;
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', respuestaCorrecta: { valor: true } };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'DESLIZA Y ACIERTA';
  }

  elegir(valor: boolean): void {
    if (this.confirmado) return;
    this.confirmado = true;
    this.elegido = valor ? 'si' : 'no';
    this.respuesta.emit({ valor });
  }
}
