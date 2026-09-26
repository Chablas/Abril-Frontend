import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursoSlideDto, EmparejarConceptosConfig } from '../../../../dtos/curso.dtos';

@Component({
  selector: 'app-slide-emparejar-conceptos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './slide-emparejar-conceptos.html',
  styleUrls: ['./slide-emparejar-conceptos.css', '../../../../cursos-cascada.css'],
})
export class SlideEmparejarConceptos {
  private _slide!: CursoSlideDto;
  config: EmparejarConceptosConfig = { enunciado: '', izquierda: [], derecha: [], respuestaCorrecta: {} };
  /** id de la izquierda -> id elegido de la derecha (o '' si aún no elige). */
  selecciones: Record<string, string> = {};
  confirmado = false;

  @Input() set slide(value: CursoSlideDto) {
    this._slide = value;
    this.confirmado = false;
    try {
      this.config = JSON.parse(value.configuracionJson || '{}');
    } catch {
      this.config = { enunciado: '', izquierda: [], derecha: [], respuestaCorrecta: {} };
    }
    this.selecciones = {};
    for (const izq of this.config.izquierda) this.selecciones[izq.id] = '';
  }
  get slide(): CursoSlideDto {
    return this._slide;
  }

  @Output() respuesta = new EventEmitter<any>();

  get kicker(): string {
    return this.config.kicker || 'EMPAREJAR CONCEPTOS';
  }

  get faltanSelecciones(): boolean {
    return this.config.izquierda.some((izq) => !this.selecciones[izq.id]);
  }

  confirmar(): void {
    if (this.confirmado || this.faltanSelecciones) return;
    this.confirmado = true;
    this.respuesta.emit({ ...this.selecciones });
  }
}
