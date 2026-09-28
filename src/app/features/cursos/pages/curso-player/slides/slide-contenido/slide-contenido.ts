import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursoSlideDto, ContenidoConfig } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-contenido',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-contenido.html',
  styleUrls: ['./slide-contenido.css', '../../../../cursos-cascada.css'],
})
export class SlideContenido {
  private _slide!: CursoSlideDto;
  config: ContenidoConfig = {};

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = {};
    }
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  // Modo edición: usado solo por el editor de cursos (curso-editor) para permitir clic
  // directo sobre la imagen dentro de la vista previa en vivo. El player real nunca pasa
  // [editable]="true", así que esto no afecta a quien rinde el curso.
  @Input() editable = false;
  @Output() imagenClick = new EventEmitter<void>();

  // Fallbacks puramente visuales: si la config no trae kicker/ícono decorativo
  // (ej. el curso de ejemplo ya cargado en BD), igual se ve completo.
  get kicker(): string {
    return this.config.kicker || 'INTRODUCCIÓN';
  }

  get iconoDecorativo(): string {
    return this.config.iconoDecorativo || 'ti-info-circle';
  }

  get textoClaro(): boolean {
    return this.config.estilo?.textoClaro !== false;
  }

  siguiente(): void {
    // Slide no evaluable: se emite igual para que el player avance.
    this.respuesta.emit({ visto: true });
  }
}
