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
    <div class="st-scroll" [style.--st-accent]="color">
      <div class="flex min-w-max border-b border-[var(--st-accent)]">
        <button
          *ngFor="let t of tabs; trackBy: trackById"
          type="button"
          [disabled]="t.disabled"
          (click)="select(t)"
          class="st-tab cursor-pointer shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors flex items-center gap-2"
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
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      /* En pantallas angostas las pestañas no se comprimen ni parten el texto en
         columnas de una palabra (era lo que pasaba con el flex a secas): la tira
         se desplaza en horizontal, que es el patrón estándar de tabs en móvil.
         La barra de scroll se oculta — la pestaña cortada a la derecha ya avisa
         que hay más. El .min-w-max de la fila interna la deja crecer más allá del
         contenedor, y el border-b sigue abarcando todo el ancho visible cuando
         las pestañas entran sin scroll. */
      .st-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .st-scroll::-webkit-scrollbar {
        display: none;
      }

      @media (max-width: 639.98px) {
        .st-tab {
          padding-left: 12px;
          padding-right: 12px;
          font-size: 0.8125rem;
        }
      }
    `,
  ],
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
