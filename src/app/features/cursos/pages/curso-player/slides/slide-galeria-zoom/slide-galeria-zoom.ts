import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, GaleriaZoomConfig, GaleriaImagen } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-galeria-zoom',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-galeria-zoom.html',
  styleUrls: ['./slide-galeria-zoom.css', '../../../../cursos-cascada.css'],
})
export class SlideGaleriaZoom {
  private _slide!: CursoSlideDto;
  config: GaleriaZoomConfig = { imagenes: [] };
  imagenAmpliada: GaleriaImagen | null = null;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.imagenAmpliada = null;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { imagenes: [] };
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  // Modo edición: solo usado por curso-editor para la vista previa en vivo.
  @Input() editable = false;
  @Output() imagenClick = new EventEmitter<number>(); // índice de la foto

  get kicker(): string {
    return this.config.kicker || 'EVIDENCIA';
  }

  get textoClaro(): boolean {
    return this.config.estilo?.textoClaro !== false;
  }

  ampliar(imagen: GaleriaImagen): void {
    this.imagenAmpliada = imagen;
  }

  cerrar(): void {
    this.imagenAmpliada = null;
  }

  siguiente(): void {
    this.respuesta.emit({ visto: true });
  }
}
