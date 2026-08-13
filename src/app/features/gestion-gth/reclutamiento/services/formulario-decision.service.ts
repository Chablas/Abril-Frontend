import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ReclutamientoService } from './reclutamiento.service';
import { CandidatoFormularioResumen } from '../dtos/formulario-postulante.dto';

/** Resultado de una decisión ya aplicada sobre el formulario de un candidato. */
export interface DecisionFormularioAplicada {
  /** Estado resultante del formulario, para refrescar la bandeja o el modal. */
  resumen: CandidatoFormularioResumen;
  /** Observaciones que se le enviaron al postulante; null cuando se aprobó. */
  motivo: string | null;
}

/**
 * Flujo de aprobar/rechazar el formulario del postulante (confirmación, llamada al backend y
 * avisos). Vive acá porque lo usan los dos lugares desde donde GTH decide: el modal "Ver
 * formulario" y los botones de la ficha del candidato en el detalle del requerimiento. Al estar
 * en un solo sitio, ambos piden las observaciones igual y muestran el mismo mensaje.
 */
@Injectable({ providedIn: 'root' })
export class FormularioDecisionService {
  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  /** Aprueba el formulario del candidato. Devuelve null si la operación falló. */
  aprobar(candidatoId: number): Promise<DecisionFormularioAplicada | null> {
    return this.registrar(candidatoId, true, null);
  }

  /**
   * Rechaza el formulario. Hay dos casos y no se piden las mismas cosas:
   *  • Ya completado: las observaciones son obligatorias — se le envían por correo al postulante y
   *    se le muestran en cada página del formulario mientras corrige; sin ellas no sabría qué
   *    cambiar.
   *  • Enviado pero nunca llenado: es un descarte interno para que el proceso siga sin él, así que
   *    el motivo es opcional (queda como registro) y no se le escribe nada al postulante.
   *
   * Devuelve null si GTH canceló el diálogo o si la operación falló.
   */
  async rechazar(
    candidatoId: number,
    completado: boolean,
  ): Promise<DecisionFormularioAplicada | null> {
    const dialogo = completado
      ? {
          icon: 'warning' as const,
          title: 'Rechazar formulario',
          text: 'El postulante recibirá estas observaciones por correo, junto al enlace de su formulario con lo que ya llenó, para que corrija y lo vuelva a enviar.',
          inputLabel: 'Observaciones para el postulante',
          inputPlaceholder: 'Indica qué debe corregir o completar en su formulario…',
          inputValidator: (valor: string) =>
            (valor ?? '').trim()
              ? null
              : 'Escribe las observaciones que se le enviarán al postulante.',
        }
      : {
          icon: 'question' as const,
          title: 'Rechazar formulario sin completar',
          text:
            'El postulante todavía no llenó su formulario. Al rechazarlo el proceso puede continuar sin él, y no se le envía ningún correo. ' +
            'Su enlace sigue vigente: si lo completa más adelante volverá a aparecer como «Por revisar».',
          inputLabel: 'Motivo (opcional, queda como registro interno)',
          inputPlaceholder: 'Ej. No respondió tras dos recordatorios',
          inputValidator: undefined,
        };

    const { value: motivo, isConfirmed } = await Swal.fire({
      icon: dialogo.icon,
      title: dialogo.title,
      text: dialogo.text,
      input: 'textarea',
      inputLabel: dialogo.inputLabel,
      inputPlaceholder: dialogo.inputPlaceholder,
      inputValidator: dialogo.inputValidator,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B91C1C',
    });
    if (!isConfirmed) return null;

    return this.registrar(candidatoId, false, motivo);
  }

  private async registrar(
    candidatoId: number,
    aprobado: boolean,
    motivo: string | null,
  ): Promise<DecisionFormularioAplicada | null> {
    this.loaderService.show();
    try {
      const res = await firstValueFrom(
        this.service.decisionFormulario(candidatoId, aprobado, motivo),
      );
      this.loaderService.hide();
      Swal.fire({
        icon: 'success',
        title: aprobado ? 'Formulario aprobado' : 'Formulario rechazado',
        // El backend distingue si le escribió o no al postulante; el mensaje viene de allá.
        text: res.message,
        confirmButtonColor: '#005D9D',
      });
      return { resumen: res.formulario, motivo: aprobado ? null : motivo || null };
    } catch (err) {
      this.loaderService.hide();
      this.errorService.handleError(err as HttpErrorResponse);
      return null;
    }
  }
}
