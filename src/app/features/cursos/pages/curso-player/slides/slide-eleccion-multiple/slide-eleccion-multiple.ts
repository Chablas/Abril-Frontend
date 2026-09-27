import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, EleccionMultipleConfig, OpcionSimple } from '../../../../dtos/curso.dtos';
import { barajar } from '../../../../shuffle-util';

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
    this.opcionesBarajadas = this.config.ordenAleatorio ? barajar(this.config.opciones) : [];
  }

  private opcionesBarajadas: OpcionSimple[] = [];

  get opcionesMostradas(): OpcionSimple[] {
    return this.config.ordenAleatorio ? this.opcionesBarajadas : this.config.opciones;
  }

  /** A diferencia de VF/opción única/desliza-acierta, aquí SIEMPRE se requiere el botón
   *  "Confirmar respuesta": son checkboxes, el primer clic no puede disparar el envío o
   *  nunca se podría marcar una segunda opción. "Activar botón para enviar" no aplica a
   *  este tipo — por eso el editor no ofrece ese toggle para pregunta_eleccion_multiple. */
  get requiereConfirmar(): boolean {
    return true;
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();
  @Input() disposicion: 'horizontal' | 'vertical' = 'horizontal';
  @Input() estilo: 'oscuro' | 'claro' | 'adaptado-oscuro' | 'adaptado-claro' = 'claro';

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
