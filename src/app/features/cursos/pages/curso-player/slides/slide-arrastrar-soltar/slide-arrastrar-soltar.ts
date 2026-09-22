import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CursoSlideDto, ArrastrarSoltarConfig, ArrastrarItem } from '../../../../dtos/curso.dtos';

interface ZonaConItems {
  id: string;
  texto: string;
  items: ArrastrarItem[];
}

@Component({
  selector: 'app-slide-arrastrar-soltar',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList, CdkDropListGroup],
  templateUrl: './slide-arrastrar-soltar.html',
  styleUrls: ['./slide-arrastrar-soltar.css', '../../../../cursos-cascada.css'],
})
export class SlideArrastrarSoltar {
  private _slide!: CursoSlideDto;
  config: ArrastrarSoltarConfig = { enunciado: '', items: [], zonas: [] };
  bandeja: ArrastrarItem[] = [];
  zonas: ZonaConItems[] = [];
  confirmado = false;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', items: [], zonas: [] };
    }
    this.bandeja = [...(this.config.items ?? [])];
    this.zonas = (this.config.zonas ?? []).map((z) => ({ ...z, items: [] }));
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'ARRASTRA A LA ZONA CORRECTA';
  }

  dropListIds(): string[] {
    return ['bandeja', ...this.zonas.map((z) => z.id)];
  }

  private listaPorId(id: string): ArrastrarItem[] {
    if (id === 'bandeja') return this.bandeja;
    return this.zonas.find((z) => z.id === id)!.items;
  }

  drop(event: CdkDragDrop<ArrastrarItem[]>): void {
    if (this.confirmado) return;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  get todoAsignado(): boolean {
    return this.bandeja.length === 0 && this.config.items.length > 0;
  }

  confirmar(): void {
    if (!this.todoAsignado || this.confirmado) return;
    this.confirmado = true;
    const asignaciones: Record<string, string[]> = {};
    this.zonas.forEach((z) => (asignaciones[z.id] = z.items.map((i) => i.id)));
    this.respuesta.emit({ asignaciones });
  }
}
