import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleCasePipe } from '../../../../../../../shared/pipes/title-case.pipe';
import { ActorCeldaDTO, ActorOrigen } from '../../dtos/revisores-areas.dto';

/**
 * El valor de una celda de Revisores de Áreas: quiénes son y de dónde sale. Lo usan la tabla (en
 * `compacto`, el primero y un "+N") y el detalle (todos, numerados si son varios).
 */
@Component({
  standalone: true,
  selector: 'app-actor-valor',
  imports: [CommonModule, TitleCasePipe],
  template: `
    <ng-container *ngIf="celda?.aplica !== false; else noAplica">
      <ng-container *ngIf="celda?.personas?.length; else sinPersonas">
        <!-- Compacto: el primero y cuántos más, con todos en el título -->
        <div *ngIf="compacto" class="flex flex-wrap items-center gap-x-[6px] gap-y-[2px]" [title]="todos">
          <span class="text-gray-700 leading-tight">{{ (celda!.personas[0].nombre || '—') | titleCase }}</span>
          <span *ngIf="celda!.personas.length > 1"
                class="text-[10px] px-[6px] py-[1px] rounded-full bg-[var(--color-abril-standard-light)] text-[var(--color-abril-standard)] font-semibold whitespace-nowrap">
            +{{ celda!.personas.length - 1 }}
          </span>
        </div>

        <!-- Completo: todos, en orden -->
        <div *ngIf="!compacto" class="flex flex-col gap-[2px]">
          <div *ngFor="let p of celda!.personas; let i = index" class="flex items-baseline gap-[5px] leading-tight">
            <span *ngIf="celda!.personas.length > 1" class="text-[10px] font-semibold text-gray-400">{{ i + 1 }}.</span>
            <span class="text-gray-700" [title]="p.email || ''">{{ (p.nombre || '—') | titleCase }}</span>
          </div>
        </div>
      </ng-container>

      <ng-template #sinPersonas>
        <span *ngIf="celda?.descriptor; else vacio" class="text-gray-500 italic leading-tight">{{ celda!.descriptor }}</span>
        <ng-template #vacio><span class="text-gray-400">—</span></ng-template>
      </ng-template>

      <span *ngIf="mostrarOrigen && (celda?.personas?.length || celda?.descriptor)"
            class="inline-block mt-[3px] text-[10px] px-[6px] py-[1px] rounded-full font-medium whitespace-nowrap"
            [ngClass]="clasesOrigen(celda!.origen)">
        {{ etiquetaOrigen(celda!.origen) }}
      </span>
    </ng-container>

    <ng-template #noAplica><span class="text-gray-300">—</span></ng-template>
  `,
})
export class ActorValor {
  @Input() celda?: ActorCeldaDTO | null;
  /** true = una línea: el primero y "+N" (la tabla). */
  @Input() compacto = false;
  @Input() mostrarOrigen = true;

  /** Todos los nombres, para el título del compacto. */
  get todos(): string {
    return (this.celda?.personas ?? []).map((p) => p.nombre ?? '').filter(Boolean).join(', ');
  }

  etiquetaOrigen(origen: ActorOrigen): string {
    switch (origen) {
      case 'Personalizado': return 'Personalizado';
      case 'PersonalizadoArea': return 'Personalizado (área)';
      case 'Gth': return 'Por defecto';
      default: return 'Algoritmo';
    }
  }

  /** Lo cargado a mano se distingue de lo que resolvió el sistema y del último recurso. */
  clasesOrigen(origen: ActorOrigen): string {
    switch (origen) {
      case 'Personalizado':
      case 'PersonalizadoArea':
        return 'bg-[var(--color-abril-standard-light)] text-[var(--color-abril-standard)]';
      case 'Gth':
        return 'bg-[#FEF9C3] text-[#92400E]';
      default:
        return 'bg-[#E8F1FB] text-[var(--color-abril-logo-blue)]';
    }
  }
}
