import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import {
  EstadoPasoReembolso,
  ReembolsoPipelineDto,
  ReembolsoPipelinePasoDto,
  pasoReembolsoColors,
} from '../../dtos/reembolso-pipeline.dto';

/**
 * El recorrido del reembolso, de la solicitud al pago, en una tira horizontal de fases.
 *
 * Lo muestran los modales de detalle de cinco pantallas —Solicitud de Salidas, Gestión de Salidas,
 * Mis Rendiciones, Gestión de Rendiciones y Consolidados— y contesta la única pregunta con la que
 * el trabajador abre el modal: en qué va su reembolso y quién lo tiene. Por eso debajo de la tira
 * va la frase que nombra a quién le toca, y no solo el nombre de la fase.
 *
 * El recorrido lo arma el backend y viaja dentro del detalle: acá no se deduce nada de estados
 * sueltos. Lo único que resuelve el componente es cómo se ve.
 *
 * No es navegable —no se puede "ir" a un paso— porque las acciones de cada fase viven en la
 * pantalla a la que le toca: esto es seguimiento, no un asistente.
 */
@Component({
  standalone: true,
  selector: 'app-reembolso-pipeline',
  imports: [CommonModule],
  templateUrl: './reembolso-pipeline.html',
  styleUrl: './reembolso-pipeline.css',
})
export class ReembolsoPipeline {
  /** Null mientras el detalle no llegó: el componente no pinta nada. */
  @Input() pipeline: ReembolsoPipelineDto | null = null;

  /**
   * Título del encabezado. Consolidados pasa «Seguimiento» a secas: ahí se habla del consolidado,
   * no del reembolso, y el encabezado ya lo nombra («· Consolidado CONS-…»).
   */
  @Input() titulo = 'Seguimiento del reembolso';

  /**
   * El recorrido, solo si tiene fases. Un detalle viejo o un DTO sin llenar dejaría una tarjeta
   * vacía en lo primero que se lee del modal, y eso se ve como un error.
   */
  get datos(): ReembolsoPipelineDto | null {
    return this.pipeline && this.pipeline.pasos.length > 0 ? this.pipeline : null;
  }

  get pasos(): ReembolsoPipelinePasoDto[] {
    return this.pipeline?.pasos ?? [];
  }

  /**
   * El conector que entra a la fase `i`: se pinta como recorrido solo si la anterior ya se cumplió.
   * Una fase observada no lo tiñe — justamente ahí es donde el camino se detuvo.
   */
  conectorCumplido(i: number): boolean {
    return this.pasos[i - 1]?.estado === 'completado';
  }

  /** Cuánto del recorrido va cubierto, para la barra de la vista angosta. */
  get progreso(): number {
    const p = this.pipeline;
    if (!p || p.totalPasos === 0) return 0;
    return Math.round((p.pasoActual / p.totalPasos) * 100);
  }

  /** El título de la fase actual: es lo que se lee al lado de la barra en la vista angosta. */
  get tituloActual(): string {
    return this.pasos[(this.pipeline?.pasoActual ?? 1) - 1]?.titulo ?? '';
  }

  readonly colores = pasoReembolsoColors;

  /**
   * El ícono del círculo. Con la fase cumplida es el check; la observada y la cancelada llevan su
   * propio signo y el resto se queda con su número, que es lo que dice cuánto falta.
   */
  icono(estado: EstadoPasoReembolso): 'check' | 'alerta' | 'equis' | 'numero' {
    switch (estado) {
      case 'completado': return 'check';
      case 'observado':  return 'alerta';
      case 'cancelado':  return 'equis';
      default:           return 'numero';
    }
  }
}
