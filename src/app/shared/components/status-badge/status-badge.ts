import { Component, Input } from '@angular/core';

/**
 * Badge de estado reutilizable.
 * Los colores se pasan como valores CSS (hex, rgb, etc.) y se aplican
 * como estilos inline para evitar problemas con el purge de Tailwind.
 *
 * Uso:
 *   <app-status-badge text="ACTIVO"    bgColor="#D7FAF4" textColor="#009C87" />
 *   <app-status-badge text="INACTIVO"  bgColor="#FAD5D4" textColor="#D30000" />
 *   <app-status-badge text="Pendiente" bgColor="#FEF9C3" textColor="#92400E" />
 */
@Component({
  standalone: true,
  selector: 'app-status-badge',
  template: `
    <span
      class="inline-block rounded-lg px-[8px] py-[2px] my-[4px] text-xs font-semibold"
      [style.background-color]="bgColor"
      [style.color]="textColor">
      {{ text }}
    </span>
  `,
})
export class StatusBadge {
  @Input() text = '';
  @Input() bgColor = '#D7FAF4';
  @Input() textColor = '#009C87';
}
