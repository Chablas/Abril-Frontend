import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Input de búsqueda estilizado con ícono de lupa.
 * Emite el texto escrito vía `valueChange`.
 *
 * Búsqueda por palabras en desorden: usa `SearchInput.matches(label, query)`
 * para filtrar listas del lado del consumidor (misma lógica que app-search-select).
 */
@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule, NgIf],
  template: `
    <div
      class="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-400
             focus-within:bg-white focus-within:border-[#64bc04] focus-within:shadow-[0_0_0_3px_rgba(100,188,4,0.15)] transition-all"
      [style.width]="width"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="flex-shrink-0">
        <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
      </svg>
      <input
        type="text"
        [placeholder]="placeholder"
        [(ngModel)]="value"
        (ngModelChange)="valueChange.emit($event)"
        class="flex-1 border-0 outline-none bg-transparent text-gray-900 text-sm min-w-0"
      />
      <button
        *ngIf="value"
        (click)="clear()"
        class="flex-shrink-0 text-gray-400 hover:text-gray-600 leading-none cursor-pointer"
        type="button"
        aria-label="Limpiar"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `,
})
export class SearchInput {
  @Input() placeholder: string = 'Buscar...';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();
  /** Ancho CSS del contenedor (ej. '280px', '100%'). Por defecto 280px. */
  @Input() width: string = '280px';

  clear(): void {
    this.value = '';
    this.valueChange.emit('');
  }

  /**
   * Devuelve true si `label` contiene todas las palabras de `query` (en cualquier orden).
   * Ignora tildes y mayúsculas.
   *
   * Uso: `SearchInput.matches(item.fullName, this.searchText)`
   */
  static matches(label: string, query: string): boolean {
    if (!query.trim()) return true;
    const normalize = (t: string) =>
      t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const words = query.trim().split(/\s+/).map(normalize);
    const target = normalize(label);
    return words.every(w => target.includes(w));
  }
}
