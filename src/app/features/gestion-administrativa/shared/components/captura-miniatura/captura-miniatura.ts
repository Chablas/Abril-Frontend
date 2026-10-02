import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { DraggableImage } from '../../../../../shared/components/draggable-image/draggable-image';

/**
 * True si alguno de los textos (nombre del archivo o URL) termina en `.pdf`. El object URL de un
 * archivo recién elegido no trae extensión, así que ahí decide el nombre.
 */
export function esCapturaPdf(...textos: (string | null | undefined)[]): boolean {
  return textos.some((t) => /\.pdf$/i.test((t ?? '').split(/[?#]/)[0]));
}

/**
 * La miniatura de UNA captura de movilidad. Si es imagen, la imagen con su zoom al hacer clic
 * (`app-draggable-image`); si es PDF, que no tiene vista previa en miniatura, el ícono rojo de
 * archivo, que al hacer clic abre el PDF en una ventana nueva.
 *
 * Llena la caja que le da la página (el tamaño y el borde son de ella). La usan la tabla de
 * trayectos y el editor de capturas del módulo, que son por donde pasan las siete pantallas.
 */
@Component({
  standalone: true,
  selector: 'app-captura-miniatura',
  imports: [CommonModule, DraggableImage],
  templateUrl: './captura-miniatura.html',
  styleUrl: './captura-miniatura.css',
})
export class CapturaMiniatura {
  /** webUrl de SharePoint (la captura guardada) o el object URL del archivo recién elegido. */
  @Input({ required: true }) url!: string;
  /** Nombre del archivo. Con él (o con la URL) se sabe si es un PDF. */
  @Input() nombre: string | null = null;

  get esPdf(): boolean {
    return esCapturaPdf(this.nombre, this.url);
  }
}
