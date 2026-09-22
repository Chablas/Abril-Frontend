import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, OpcionMultipleConfig } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-opcion-multiple',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-opcion-multiple.html',
  styleUrls: ['./slide-opcion-multiple.css', '../../../../cursos-cascada.css'],
})
export class SlideOpcionMultiple {
  private _slide!: CursoSlideDto;
  config: OpcionMultipleConfig = { enunciado: '', opciones: [] };
  seleccionId: string | number | null = null;
  confirmado = false;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.seleccionId = null;
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', opciones: [] };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'ELIGE LA OPCIÓN CORRECTA';
  }

  elegir(id: string | number): void {
    if (this.confirmado) return;
    this.seleccionId = id;
  }

  confirmar(): void {
    if (this.seleccionId === null || this.confirmado) return;
    this.confirmado = true;
    this.respuesta.emit({ opcionId: this.seleccionId });
  }
}
