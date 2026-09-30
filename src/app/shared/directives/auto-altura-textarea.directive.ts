import { AfterViewInit, Directive, DoCheck, ElementRef, HostListener } from '@angular/core';

/** Ajusta la altura de un <textarea> a su contenido — crece mientras se escribe, en vez de
 *  quedar con scroll interno a una altura fija. Uso: agregar `appAutoAlturaTextarea` al
 *  <textarea>; funciona con cualquier binding de valor (ngModel, reactive forms, etc.). */
@Directive({
  selector: 'textarea[appAutoAlturaTextarea]',
  standalone: true,
})
export class AutoAlturaTextareaDirective implements AfterViewInit, DoCheck {
  constructor(private el: ElementRef<HTMLTextAreaElement>) {}

  private ultimoValor = '';

  ngAfterViewInit(): void {
    // Contenido inicial (ej. al editar un ATS ya guardado, con controles ya escritos) —
    // sin esto, el textarea arranca en su altura fija hasta el primer tecleo del usuario.
    this.ultimoValor = this.el.nativeElement.value;
    this.ajustar();
  }

  @HostListener('input')
  onInput(): void {
    this.ajustar();
  }

  /** El valor también puede cambiar SIN que el usuario escriba (ej. un botón "+ control
   *  sugerido" que hace ngModel = texto por código) — eso no dispara 'input', así que el
   *  textarea se quedaba chico hasta que la persona tecleaba algo. DoCheck detecta ese caso. */
  ngDoCheck(): void {
    if (this.el.nativeElement.value !== this.ultimoValor) {
      this.ultimoValor = this.el.nativeElement.value;
      this.ajustar();
    }
  }

  private ajustar(): void {
    const nodo = this.el.nativeElement;
    nodo.style.height = 'auto';
    nodo.style.height = `${nodo.scrollHeight}px`;
  }
}
