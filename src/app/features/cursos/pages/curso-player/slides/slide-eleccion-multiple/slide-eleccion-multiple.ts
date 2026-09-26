import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, EleccionMultipleConfig, OpcionSimple } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-eleccion-multiple',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-eleccion-multiple.html',
  styleUrls: ['./slide-eleccion-multiple.css', '../../../../cursos-cascada.css'],
})
export class SlideEleccionMultiple {
  private _slide!: CursoSlideDto;
  config: EleccionMultipleConfig = { enunciado: '', opciones: [], respuestaCorrecta: { opcionIds: [] } };
  seleccionIds = new Set<string | number>();
  confirmado = false;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.seleccionIds = new Set();
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', opciones: [], respuestaCorrecta: { opcionIds: [] } };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'ELECCIÓN MÚLTIPLE — PUEDES MARCAR VARIAS';
  }

  toggle(id: string | number): void {
    if (this.confirmado) return;
    this.seleccionIds.has(id) ? this.seleccionIds.delete(id) : this.seleccionIds.add(id);
  }

  confirmar(): void {
    if (this.confirmado || !this.seleccionIds.size) return;
    this.confirmado = true;
    // Orden determinístico: el mismo de `opciones`, no el orden en que se marcaron.
    const opcionIds = this.config.opciones
      .filter((o: OpcionSimple) => this.seleccionIds.has(o.id))
      .map((o: OpcionSimple) => o.id);
    this.respuesta.emit({ opcionIds });
  }
}
