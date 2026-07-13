import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../base-modal/base-modal';

/**
 * Modal estándar de filtros: envuelve app-base-modal (centrado, no fullScreen)
 * con el pie "Limpiar filtros" / "Listo" ya resuelto. Los combos de filtro se
 * proyectan como contenido (ng-content), cada uno auto-buscando al cambiar
 * (patrón (valueChange)="filters.x = $event; onSearch()").
 *
 * Uso:
 *   <app-filter-modal *ngIf="filtrosAbiertos" (closeModal)="filtrosAbiertos = false" (clear)="limpiarFiltros()">
 *     <app-search-select ...></app-search-select>
 *     ...
 *   </app-filter-modal>
 */
@Component({
  selector: 'app-filter-modal',
  standalone: true,
  imports: [CommonModule, BaseModal],
  template: `
    <app-base-modal [title]="'Filtros'" width="w-[520px]" (closeModal)="closeModal.emit()">
      <div class="flex flex-col gap-[18px] mt-[10px]">
        <ng-content></ng-content>

        <div class="flex items-center justify-between pt-[4px]">
          <button type="button" (click)="clear.emit()"
            class="text-[12px] font-medium text-gray-500 hover:underline cursor-pointer">
            Limpiar filtros
          </button>
          <button type="button" (click)="closeModal.emit()"
            class="h-[34px] px-[18px] rounded-[7px] text-white text-[12px] font-medium cursor-pointer"
            style="background:var(--color-abril-standard)">
            Listo
          </button>
        </div>
      </div>
    </app-base-modal>
  `,
})
export class FilterModal {
  @Output() closeModal = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
}
