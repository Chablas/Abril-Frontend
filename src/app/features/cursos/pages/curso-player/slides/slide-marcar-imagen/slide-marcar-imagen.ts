import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, MarcarImagenConfig } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-marcar-imagen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-marcar-imagen.html',
  styleUrls: ['./slide-marcar-imagen.css', '../../../../cursos-cascada.css'],
})
export class SlideMarcarImagen {
  private _slide!: CursoSlideDto;
  config: MarcarImagenConfig = { enunciado: '', imagenes: [] };
  seleccionId: string | number | null = null;
  confirmado = false;
  imagenZoomUrl: string | null = null;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.seleccionId = null;
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', imagenes: [] };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'MARCA LA IMAGEN CORRECTA';
  }

  elegir(id: string | number): void {
    if (this.confirmado) return;
    this.seleccionId = id;
    this.confirmado = true;
    this.respuesta.emit({ imagenId: id });
  }

  // Ampliar imagen: mejora puramente visual, no cuenta como selección/respuesta.
  ampliar(event: Event, url: string): void {
    event.stopPropagation();
    this.imagenZoomUrl = url;
  }

  cerrarZoom(): void {
    this.imagenZoomUrl = null;
  }
}
