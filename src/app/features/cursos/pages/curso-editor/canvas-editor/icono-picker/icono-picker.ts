import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TABLER_ICON_NAMES } from '../tabler-icon-names';

const LIMITE_RESULTADOS = 120;

@Component({
  selector: 'app-icono-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './icono-picker.html',
  styleUrl: './icono-picker.css',
})
export class IconoPicker {
  @Input() claseActual = '';
  @Output() seleccionar = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();

  abierto = false;
  busqueda = '';

  abrir(): void {
    this.busqueda = '';
    this.abierto = true;
  }

  cerrarPicker(): void {
    this.abierto = false;
    this.cerrar.emit();
  }

  elegir(nombre: string): void {
    this.seleccionar.emit(nombre);
    this.cerrarPicker();
  }

  get resultados(): string[] {
    const termino = this.busqueda.trim().toLowerCase().replace(/\s+/g, '-');
    const lista = termino ? TABLER_ICON_NAMES.filter((n) => n.includes(termino)) : TABLER_ICON_NAMES;
    return lista.slice(0, LIMITE_RESULTADOS);
  }

  get totalCoincidencias(): number {
    const termino = this.busqueda.trim().toLowerCase().replace(/\s+/g, '-');
    return termino ? TABLER_ICON_NAMES.filter((n) => n.includes(termino)).length : TABLER_ICON_NAMES.length;
  }
}
