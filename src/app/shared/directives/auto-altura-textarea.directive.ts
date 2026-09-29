import { AfterViewInit, Directive, ElementRef, HostListener } from '@angular/core';

/** Ajusta la altura de un <textarea> a su contenido — crece mientras se escribe, en vez de
 *  quedar con scroll interno a una altura fija. Uso: agregar `appAutoAlturaTextarea` al
 *  <textarea>; funciona con cualquier binding de valor (ngModel, reactive forms, etc.). */
@Directive({
  selector: 'textarea[appAutoAlturaTextarea]',
  standalone: true,
})
export class AutoAlturaTextareaDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLTextAreaElement>) {}

  ngAfterViewInit(): void {
    // Contenido inicial (ej. al editar un ATS ya guardado, con controles ya escritos) —
    // sin esto, el textarea arranca en su altura fija hasta el primer tecleo del usuario.
    this.ajustar();
  }

  @HostListener('input')
  onInput(): void {
    this.ajustar();
  }

  private ajustar(): void {
    const nodo = this.el.nativeElement;
    nodo.style.height = 'auto';
    nodo.style.height = `${nodo.scrollHeight}px`;
  }
}
