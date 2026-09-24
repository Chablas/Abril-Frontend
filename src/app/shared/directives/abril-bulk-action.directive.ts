import { Directive, HostBinding, Input } from '@angular/core';

export type AbrilBulkActionVariant = 'default' | 'danger' | 'primary';

/**
 * 'default' es el botón de siempre, chico, para las acciones que acompañan a la selección.
 * 'lg' es para la acción principal de una pantalla que se perdía entre las demás (ej. «Subir
 * consolidado del S10» en Gestión de Rendiciones): más alto y con letra más grande, pero sin
 * llegar al tamaño de un botón de formulario.
 */
export type AbrilBulkActionSize = 'default' | 'lg';

/**
 * Estandariza el botón de una acción bulk sobre una selección de filas
 * (ej. "Aprobar", "Rechazar", "Marcar como rendidas"): borde neutro con
 * texto gris para 'default'/'danger', relleno teal para 'primary'.
 *
 * Uso: <button abrilBulkAction="primary" [disabled]="...">...</button>
 *      <button abrilBulkAction="primary" abrilBulkActionSize="lg">...</button>
 *
 * Cambiar las clases de este directive re-estiliza TODOS los botones bulk
 * de la app que lo usen — single source of truth, igual que los tokens de
 * color en styles.css.
 */
@Directive({
  selector: '[abrilBulkAction]',
  standalone: true,
})
export class AbrilBulkActionDirective {
  @Input('abrilBulkAction') variant: AbrilBulkActionVariant = 'default';

  @Input() abrilBulkActionSize: AbrilBulkActionSize = 'default';

  // focus-visible: aro de foco solo por teclado (Tab), no al hacer clic con
  // mouse; usa el mismo teal (--color-abril-standard) que ya trae el hover
  // de 'default'/'primary', sin introducir un acento nuevo.
  private static readonly BASE =
    'flex items-center justify-center cursor-pointer transition-colors disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-abril-standard)]';

  private static readonly SIZE: Record<AbrilBulkActionSize, string> = {
    default: 'h-[26px] px-[10px] rounded-[6px] text-[11px] font-medium gap-1.5',
    lg: 'h-[34px] px-[14px] rounded-[7px] text-[13px] font-semibold gap-2',
  };

  @HostBinding('class')
  get hostClass(): string {
    const base = `${AbrilBulkActionDirective.BASE} ${AbrilBulkActionDirective.SIZE[this.abrilBulkActionSize] ?? AbrilBulkActionDirective.SIZE.default}`;
    if (this.variant === 'primary') {
      return `${base} text-white bg-[var(--color-abril-standard)] disabled:bg-gray-300`;
    }
    if (this.variant === 'danger') {
      return `${base} border border-[#e2e8f0] text-gray-600 hover:bg-red-50 hover:border-red-200 disabled:text-gray-300 disabled:hover:bg-transparent disabled:hover:border-[#e2e8f0]`;
    }
    return `${base} border border-[#e2e8f0] text-gray-600 hover:bg-[var(--color-abril-standard-light)] hover:border-[var(--color-abril-standard-border)] disabled:text-gray-300 disabled:hover:bg-transparent disabled:hover:border-[#e2e8f0]`;
  }
}
