import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursoSlideDto, RespuestaCortaConfig } from '../../../../dtos/curso.dtos';
import { normalizarTexto } from '../../normalizar-texto';

@Component({
  selector: 'app-slide-respuesta-corta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './slide-respuesta-corta.html',
  styleUrls: ['./slide-respuesta-corta.css', '../../../../cursos-cascada.css'],
})
export class SlideRespuestaCorta {
  private _slide!: CursoSlideDto;
  config: RespuestaCortaConfig = { enunciado: '', respuestaCorrecta: { texto: '' } };
  texto = '';
  confirmado = false;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.texto = '';
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', respuestaCorrecta: { texto: '' } };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'RESPUESTA CORTA';
  }

  confirmar(): void {
    if (this.confirmado || !this.texto.trim()) return;
    this.confirmado = true;

    const escrito = normalizarTexto(this.texto);
    const aceptadas = [this.config.respuestaCorrecta.texto, ...(this.config.variantesAceptadas || [])].map(
      normalizarTexto,
    );
    const coincide = aceptadas.includes(escrito);

    this.respuesta.emit({ texto: coincide ? this.config.respuestaCorrecta.texto : this.texto });
  }
}
