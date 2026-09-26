import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const HEX_VALIDO = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Selector de color + campo de texto para escribir el hex directo (ej. "#fcc132"), en
 *  vez de depender solo del picker nativo del navegador — mismo par en todo el módulo de
 *  cursos (panel de propiedades, barra contextual flotante, fondo de pantalla). */
@Component({
  selector: 'app-color-hex-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-hex-input.html',
  styleUrl: './color-hex-input.css',
})
export class ColorHexInput implements OnChanges {
  @Input() valor: string | null | undefined = '#000000';
  @Output() valorChange = new EventEmitter<string>();
  /** Se emite además de valorChange, para el mismo patrón guardarHistorial() que ya usan
   *  el resto de campos del panel (el (change)/(ngModelChange) local no alcanza porque el
   *  historial vive en el componente padre). */
  @Output() confirmado = new EventEmitter<void>();

  /** Buffer del texto mientras se escribe — permite estados intermedios inválidos
   *  ("#fc") sin pisar el valor real hasta que el hex sea válido. */
  textoHex = this.valor || '';

  ngOnChanges(changes: SimpleChanges): void {
    // El valor cambió desde afuera (otro elemento seleccionado, deshacer, etc.): resincroniza
    // el buffer de texto salvo que sea justo el eco de lo que este mismo input acaba de emitir.
    if (changes['valor'] && (this.valor || '') !== this.textoHex) {
      this.textoHex = this.valor || '';
    }
  }

  alCambiarPicker(nuevo: string): void {
    this.textoHex = nuevo;
    this.valorChange.emit(nuevo);
    this.confirmado.emit();
  }

  alEscribirHex(texto: string): void {
    this.textoHex = texto;
    const normalizado = texto.startsWith('#') ? texto : `#${texto}`;
    if (HEX_VALIDO.test(normalizado)) {
      this.valorChange.emit(normalizado);
      this.confirmado.emit();
    }
  }
}
