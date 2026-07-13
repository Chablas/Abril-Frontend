import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Botón "Filtros" con badge de cantidad activa. Pensado para proyectarse en
 * el slot `tabsExtra` de app-abril-page-header (a la altura de las pestañas,
 * sin robar una fila completa) y abrir un <app-filter-modal>.
 *
 * Uso:
 *   <app-filter-trigger tabsExtra [count]="filtrosActivos" (open)="abrirFiltros()" />
 */
@Component({
  selector: 'app-filter-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" (click)="open.emit()"
      class="relative flex items-center gap-1.5 h-[26px] px-[10px] rounded-[6px] border border-[#e2e8f0] text-[11px] font-medium text-gray-600 cursor-pointer hover:bg-[var(--color-abril-standard-light)] hover:border-[var(--color-abril-standard-border)]">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M7 12h10M10 18h4"/>
      </svg>
      Filtros
      <span *ngIf="count > 0"
        class="inline-flex items-center justify-center min-w-[15px] h-[15px] px-[3px] rounded-full text-[9px] font-semibold text-white"
        style="background:var(--color-abril-standard)">{{ count }}</span>
    </button>
  `,
})
export class FilterTriggerButton {
  @Input() count = 0;
  @Output() open = new EventEmitter<void>();
}
