import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Apaga el cambio de valor por rueda del mouse en los `<input type="number">`.
 *
 * Un input numérico enfocado sube y baja su valor al scrollear encima. En los formularios de
 * montos eso es un error silencioso: el usuario escribe S/ 25,05, baja para seguir con el
 * siguiente trayecto y el importe que ya había puesto queda en otro número sin que nada avise.
 *
 * Se resuelve quitándole el foco al campo —no bloqueando el evento— para que la rueda siga
 * scrolleando el modal: `preventDefault` dejaría la página trabada mientras el cursor pasa por
 * encima del campo. Lo escrito no se pierde: `ngModel` ya lo tomó al tipear.
 *
 * El selector apunta al `input[type=number]` y no a un atributo propio: alcanza con importar el
 * directive en el componente para que TODOS sus campos numéricos queden cubiertos, sin tener que
 * acordarse de marcarlos uno por uno.
 */
@Directive({
  selector: 'input[type=number]',
  standalone: true,
})
export class NoWheelNumberDirective {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  @HostListener('wheel')
  onWheel(): void {
    // Sin foco el navegador no toca el valor, así que no hay nada que evitar.
    if (document.activeElement !== this.el.nativeElement) return;
    this.el.nativeElement.blur();
  }
}
