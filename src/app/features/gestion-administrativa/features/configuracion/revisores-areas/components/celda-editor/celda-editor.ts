import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { TitleCasePipe } from '../../../../../../../shared/pipes/title-case.pipe';
import { PersonaOpcionDTO } from '../../dtos/revisores-areas.dto';

/** Una persona de la lista que se edita. La posición en la lista es la prioridad (1 = primera). */
export interface CeldaPersonaEdit {
  workerId: number;
  /** false = no se considera (ausencia temporal; lo usa también Delegación de Revisión). */
  active: boolean;
  /** Nombre con el que vino del detalle: la persona puede no estar en el selector. */
  nombre?: string | null;
}

/**
 * Lo personalizado en una celda de Revisores de Áreas: n personas en orden, cada una activa o no.
 * En los actores de uno solo manda la primera activa y el resto queda de respaldo; en los de varios
 * cuentan todas las activas, en ese orden.
 *
 * Edita la lista que recibe EN SU LUGAR (el modal es dueño de ella y la manda al guardar todo junto)
 * y avisa con `cambio` para marcar el modal como modificado.
 */
@Component({
  standalone: true,
  selector: 'app-revisores-celda-editor',
  imports: [CommonModule, SearchSelect, TitleCasePipe],
  template: `
    <div class="flex flex-col gap-[4px]">
      <div *ngFor="let p of personas; let i = index; trackBy: porWorker"
           class="flex items-center gap-[4px] rounded-[6px] border px-[5px] py-[3px] text-[11px] bg-white"
           [class.opacity-50]="!p.active"
           style="border-color:var(--color-abril-border)">
        <span class="shrink-0 w-[14px] text-center font-semibold text-gray-400">{{ i + 1 }}</span>
        <span class="flex-1 min-w-0 truncate text-gray-700" [class.line-through]="!p.active" [title]="nombreDe(p)">
          {{ nombreDe(p) | titleCase }}
        </span>

        <!-- Activo / inactivo -->
        <button type="button" (click)="toggleActivo(i)"
                class="shrink-0 w-[16px] h-[16px] rounded-full border flex items-center justify-center cursor-pointer"
                [style.border-color]="p.active ? 'var(--color-abril-standard)' : '#CBD5E1'"
                [title]="p.active ? 'Activo' : 'Inactivo'">
          <span class="w-[8px] h-[8px] rounded-full" [style.background]="p.active ? 'var(--color-abril-standard)' : 'transparent'"></span>
        </button>

        <!-- Subir / bajar prioridad -->
        <div class="shrink-0 flex flex-col">
          <button type="button" (click)="mover(i, -1)" [disabled]="i === 0" title="Subir"
                  class="text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default leading-none text-[9px]">▲</button>
          <button type="button" (click)="mover(i, 1)" [disabled]="i === personas.length - 1" title="Bajar"
                  class="text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default leading-none text-[9px]">▼</button>
        </div>

        <button type="button" (click)="quitar(i)" title="Quitar"
                class="shrink-0 text-[#D30000] hover:bg-[#FAD5D4] rounded-full w-[16px] h-[16px] flex items-center justify-center cursor-pointer text-[10px] leading-none">✕</button>
      </div>

      <!-- Agregar: se vuelve a crear después de cada elección para que quede vacío. -->
      <ng-container *ngFor="let k of [reinicio]">
        <app-search-select
          [compact]="true"
          [options]="disponibles"
          valueField="workerId"
          displayField="fullName"
          [value]="null"
          [showLabel]="false"
          placeholder="Agregar..."
          (valueChange)="agregar($event)">
        </app-search-select>
      </ng-container>
    </div>
  `,
})
export class RevisoresCeldaEditor {
  /** La lista que se edita en su lugar. */
  @Input({ required: true }) personas!: CeldaPersonaEdit[];
  @Input() options: PersonaOpcionDTO[] = [];
  @Output() cambio = new EventEmitter<void>();

  /** Cambia en cada alta para volver a crear el selector (y dejarlo vacío). */
  reinicio = 0;

  /** Opciones sin las personas que ya están en la lista. */
  get disponibles(): PersonaOpcionDTO[] {
    const usados = new Set(this.personas.map((p) => p.workerId));
    return this.options.filter((o) => !usados.has(o.workerId));
  }

  nombreDe(p: CeldaPersonaEdit): string {
    return this.options.find((o) => o.workerId === p.workerId)?.fullName ?? p.nombre ?? `#${p.workerId}`;
  }

  porWorker = (_: number, p: CeldaPersonaEdit) => p.workerId;

  agregar(workerId: number | null): void {
    if (workerId != null && !this.personas.some((p) => p.workerId === workerId)) {
      this.personas.push({ workerId, active: true });
      this.cambio.emit();
    }
    this.reinicio++;
  }

  quitar(index: number): void {
    this.personas.splice(index, 1);
    this.cambio.emit();
  }

  toggleActivo(index: number): void {
    this.personas[index].active = !this.personas[index].active;
    this.cambio.emit();
  }

  mover(index: number, delta: number): void {
    const destino = index + delta;
    if (destino < 0 || destino >= this.personas.length) return;
    [this.personas[index], this.personas[destino]] = [this.personas[destino], this.personas[index]];
    this.cambio.emit();
  }
}
