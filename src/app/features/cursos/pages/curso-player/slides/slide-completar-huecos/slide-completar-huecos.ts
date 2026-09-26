import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursoSlideDto, CompletarHuecosConfig } from '../../../../dtos/curso.dtos';
import { normalizarTexto } from '../../normalizar-texto';

const MARCADOR = '___';

@Component({
  selector: 'app-slide-completar-huecos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './slide-completar-huecos.html',
  styleUrls: ['./slide-completar-huecos.css', '../../../../cursos-cascada.css'],
})
export class SlideCompletarHuecos {
  private _slide!: CursoSlideDto;
  config: CompletarHuecosConfig = { texto: '', respuestaCorrecta: { textos: [] } };
  /** Segmentos de texto entre huecos: segmentos.length === respuestas.length + 1. */
  segmentos: string[] = [''];
  respuestas: string[] = [];
  confirmado = false;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { texto: '', respuestaCorrecta: { textos: [] } };
    }
    this.segmentos = (this.config.texto || '').split(MARCADOR);
    this.respuestas = this.config.respuestaCorrecta.textos.map(() => '');
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'COMPLETAR HUECOS';
  }

  get faltanRespuestas(): boolean {
    return this.respuestas.some((r) => !r.trim());
  }

  confirmar(): void {
    if (this.confirmado || this.faltanRespuestas) return;
    this.confirmado = true;

    const textosFinales = this.respuestas.map((escrito, i) => {
      const canonica = this.config.respuestaCorrecta.textos[i] || '';
      const variantes = this.config.variantesAceptadas?.[i] || [];
      const aceptadas = [canonica, ...variantes].map(normalizarTexto);
      return aceptadas.includes(normalizarTexto(escrito)) ? canonica : escrito;
    });

    this.respuesta.emit({ textos: textosFinales });
  }
}
