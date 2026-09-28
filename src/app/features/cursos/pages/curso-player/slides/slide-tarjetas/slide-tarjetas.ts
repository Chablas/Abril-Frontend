import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, TarjetasConfig, TarjetaItem } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-tarjetas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-tarjetas.html',
  styleUrls: ['./slide-tarjetas.css', '../../../../cursos-cascada.css'],
})
export class SlideTarjetas {
  private _slide!: CursoSlideDto;
  config: TarjetasConfig = { tarjetas: [] };
  tarjetaAbierta: TarjetaItem | null = null;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.tarjetaAbierta = null;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { tarjetas: [] };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  // Modo edición: solo usado por curso-editor para la vista previa en vivo (ver
  // slide-contenido.ts para el detalle de por qué es seguro para el player real).
  @Input() editable = false;
  @Output() imagenClick = new EventEmitter<number>(); // índice de la tarjeta

  get kicker(): string {
    return this.config.kicker || 'DETALLE';
  }

  get textoClaro(): boolean {
    return this.config.estilo?.textoClaro !== false;
  }

  abrir(tarjeta: TarjetaItem): void {
    if (tarjeta.descripcion) this.tarjetaAbierta = tarjeta;
  }

  cerrar(): void {
    this.tarjetaAbierta = null;
  }

  siguiente(): void {
    this.respuesta.emit({ visto: true });
  }
}
