import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SectionTab {
  /** Identificador único de la pestaña. Es lo que se devuelve por (valueChange). */
  id: string;
  /** Texto visible. */
  label: string;
  /** Opcional: si está presente, se muestra como badge a la derecha del label. */
  badge?: string | number | null;
  /** Opcional: deshabilita la pestaña. */
  disabled?: boolean;
}

/**
 * Paginado de secciones reutilizable.
 *
 * Uso:
 * <app-section-tabs [tabs]="tabs" [(value)]="active"></app-section-tabs>
 * <div *ngIf="active === 'tab1'">...</div>
 *
 * Las pestañas siguen el mismo estilo que las tabs internas del modal "Ver Lección"
 * (`Datos generales` / `Imágenes adjuntas`): borde inferior verde corporativo,
 * pestaña activa con borde superior y laterales en verde, contenido pegado debajo.
 */
@Component({
  selector: 'app-section-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex border-b border-[var(--st-accent)]" [style.--st-accent]="color">
      <button
        *ngFor="let t of tabs; trackBy: trackById"
        type="button"
        [disabled]="t.disabled"
        (click)="select(t)"
        class="cursor-pointer px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors flex items-center gap-2"
        [ngClass]="value === t.id
          ? 'border-t-[var(--st-accent)] border-x-[var(--st-accent)] border-b-white text-[var(--st-accent)] -mb-px bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
        [class.opacity-40]="t.disabled"
        [class.cursor-not-allowed]="t.disabled">
        {{ t.label }}
        <span
          *ngIf="t.badge != null"
          class="text-[0.65rem] font-bold bg-green-100 text-green-800 border border-green-200 rounded-full px-1.5 py-0.5">
          {{ t.badge }}
        </span>
      </button>
    </div>
  `,
})
export class SectionTabs {
  @Input() tabs: SectionTab[] = [];
  @Input() value: string | null = null;
  /**
   * Color de acento (borde y texto de la pestaña activa). Acepta cualquier valor
   * CSS de color o variable de la paleta (ej. 'var(--color-abril-primary)').
   * Por defecto usa el verde lima corporativo.
   */
  @Input() color: string = '#64BC04';
  @Output() valueChange = new EventEmitter<string>();

  select(t: SectionTab): void {
    if (t.disabled) return;
    if (t.id === this.value) return;
    this.value = t.id;
    this.valueChange.emit(t.id);
  }

  trackById(_: number, t: SectionTab): string {
    return t.id;
  }
}
