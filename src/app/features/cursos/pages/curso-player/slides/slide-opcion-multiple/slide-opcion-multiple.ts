import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, OpcionMultipleConfig } from '../../../../dtos/curso.dtos';
import { barajar } from '../../../../shuffle-util';

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
    this.opcionesBarajadas = this.config.ordenAleatorio ? barajar(this.config.opciones) : [];
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();
  @Input() disposicion: 'horizontal' | 'vertical' = 'horizontal';
  @Input() estilo: 'oscuro' | 'claro' | 'adaptado-oscuro' | 'adaptado-claro' = 'claro';

  get kicker(): string {
    return this.config.kicker || 'ELIGE LA OPCIÓN CORRECTA';
  }

  /** Default true por compatibilidad: los cursos ya publicados sin este campo (undefined)
   *  deben seguir pidiendo confirmación explícita, como siempre lo hizo este componente. */
  get requiereConfirmar(): boolean {
    return this.config.botonEnviarActivo ?? true;
  }

  get opcionesMostradas(): OpcionMultipleConfig['opciones'] {
    if (!this.config.ordenAleatorio) return this.config.opciones;
    return this.opcionesBarajadas;
  }

  private opcionesBarajadas: OpcionMultipleConfig['opciones'] = [];

  elegir(id: string | number): void {
    if (this.confirmado) return;
    this.seleccionId = id;
    if (!this.requiereConfirmar) {
      this.confirmado = true;
      this.respuesta.emit({ opcionId: id });
    }
  }

  confirmar(): void {
    if (this.seleccionId === null || this.confirmado) return;
    this.confirmado = true;
    this.respuesta.emit({ opcionId: this.seleccionId });
  }
}
