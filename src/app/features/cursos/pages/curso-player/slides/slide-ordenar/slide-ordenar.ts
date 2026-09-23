import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CursoSlideDto, OrdenarConfig } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-ordenar',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList],
  templateUrl: './slide-ordenar.html',
  styleUrls: ['./slide-ordenar.css', '../../../../cursos-cascada.css'],
})
export class SlideOrdenar {
  private _slide!: CursoSlideDto;
  config: OrdenarConfig = { enunciado: '', items: [] };
  items: { id: string; texto: string }[] = [];
  confirmado = false;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', items: [] };
    }
    // Se mezclan para que el usuario tenga que ordenarlos (no vienen ya en el orden correcto).
    this.items = [...(this.config.items ?? [])].sort(() => Math.random() - 0.5);
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'ORDENA LOS PASOS';
  }

  drop(event: CdkDragDrop<any[]>): void {
    if (this.confirmado) return;
    moveItemInArray(this.items, event.previousIndex, event.currentIndex);
  }

  confirmar(): void {
    if (this.confirmado) return;
    this.confirmado = true;
    this.respuesta.emit({ ordenIds: this.items.map((i) => i.id) });
  }
}
