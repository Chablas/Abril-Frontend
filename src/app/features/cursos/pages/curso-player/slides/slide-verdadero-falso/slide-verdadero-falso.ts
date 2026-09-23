import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, VerdaderoFalsoConfig } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-verdadero-falso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-verdadero-falso.html',
  styleUrls: ['./slide-verdadero-falso.css', '../../../../cursos-cascada.css'],
})
export class SlideVerdaderoFalso {
  private _slide!: CursoSlideDto;
  config: VerdaderoFalsoConfig = { enunciado: '' };
  seleccion: boolean | null = null;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.seleccion = null;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '' };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'VERDADERO O FALSO';
  }

  elegir(valor: boolean): void {
    if (this.seleccion !== null) return;
    this.seleccion = valor;
    this.respuesta.emit({ valor });
  }
}
