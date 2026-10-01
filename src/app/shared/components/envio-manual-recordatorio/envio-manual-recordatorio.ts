import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

import { AbrilModalPanel } from '../abril-modal-panel/abril-modal-panel';
import { DatePicker } from '../date-picker/date-picker';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { hoyIsoLocal } from '../../utils/fecha-local.util';
import { avisoDestinatariosHtml } from '../../utils/aviso-destinatarios';
import { RecordatorioEnvioManual, RecordatorioSimulacion } from './envio-manual-recordatorio.dto';

/**
 * Envío manual de un recordatorio desde su configuración de correos (Cronograma de Hitos y
 * Solicitud de Salidas): se elige el día a simular, el backend dice a quién le saldría ese día
 * —con el mismo cálculo que el cron— y, si se confirma, lo envía. Si ese día no sale nada, lo dice
 * y no envía nada.
 *
 * Solo el modal y los avisos: el botón lo pone la tarjeta del recordatorio y llama a `abrir()`
 * (así queda con los demás botones de la tarjeta). Las dos llamadas al backend llegan como
 * funciones, porque cada pantalla tiene su propio servicio.
 */
@Component({
  selector: 'app-envio-manual-recordatorio',
  standalone: true,
  imports: [CommonModule, AbrilModalPanel, DatePicker],
  templateUrl: './envio-manual-recordatorio.html',
  // Los botones del pie son los del modal de destinatarios de la misma pantalla.
  styleUrl: '../../styles/correos-config.css',
})
export class EnvioManualRecordatorio {
  /** Nombre del recordatorio: va de subtítulo del modal. */
  @Input({ required: true }) nombre = '';
  /** Paso 1: a quién le saldría el día `fecha` (yyyy-MM-dd), sin enviar nada. */
  @Input({ required: true }) simular!: (fecha: string) => Observable<RecordatorioSimulacion>;
  /** Paso 2: lo envía. */
  @Input({ required: true }) enviar!: (fecha: string) => Observable<RecordatorioEnvioManual>;

  abierto = false;
  fecha: string | null = null;
  /** Mientras se consulta, se confirma o se envía: nada de cerrar ni de volver a apretar. */
  ocupado = false;

  constructor(
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  abrir(): void {
    this.fecha = hoyIsoLocal();
    this.ocupado = false;
    this.abierto = true;
    this.cdr.detectChanges();
  }

  cerrar(): void {
    if (this.ocupado) return;
    this.abierto = false;
    this.cdr.detectChanges();
  }

  async continuar(): Promise<void> {
    const fecha = this.fecha;
    if (!fecha || this.ocupado) return;

    this.ocupado = true;
    this.cdr.detectChanges();

    const simulacion = await this.pedir(this.simular(fecha));
    if (!simulacion) return this.liberar();

    // Ese día no sale nada: se avisa y el modal queda abierto para probar con otro día.
    if (!simulacion.seEnvia) {
      await Swal.fire({
        icon: 'info',
        title: 'No se enviará a nadie',
        text: simulacion.motivo ?? '',
        confirmButtonText: 'Aceptar',
      });
      return this.liberar();
    }

    const nota = simulacion.correos > 1
      ? `<div style="text-align:left;margin-bottom:8px;color:#4B5563">Salen ${simulacion.correos} correos.</div>`
      : '';

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: '¿Enviar recordatorio?',
      html: nota + avisoDestinatariosHtml(simulacion.para, simulacion.copia, simulacion.copiaOculta),
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    });
    if (!confirmacion.isConfirmed) return this.liberar();

    const resultado = await this.pedir(this.enviar(fecha));
    if (!resultado) return this.liberar();

    // Entre la consulta y el envío pudo cambiar algo (alguien rindió, se apagó el recordatorio).
    if (resultado.enviados === 0 && resultado.fallidos === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'No se envió nada',
        text: resultado.motivo ?? '',
        confirmButtonText: 'Aceptar',
      });
      return this.liberar();
    }

    this.ocupado = false;
    this.abierto = false;
    this.cdr.detectChanges();

    const total = resultado.enviados + resultado.fallidos;
    if (resultado.fallidos === 0) {
      await Swal.fire({
        icon: 'success',
        title: 'Recordatorio enviado',
        text: resultado.enviados === 1 ? 'Se envió 1 correo.' : `Se enviaron ${resultado.enviados} correos.`,
        confirmButtonText: 'Aceptar',
      });
    } else if (resultado.enviados > 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Envío incompleto',
        text: `Se enviaron ${resultado.enviados} de ${total} correos.`,
        confirmButtonText: 'Aceptar',
      });
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo enviar',
        text: total === 1 ? 'Falló el envío del correo.' : `Fallaron los ${total} correos.`,
        confirmButtonText: 'Aceptar',
      });
    }
  }

  /** La petición con el loader; null si falló (el error ya se mostró). */
  private async pedir<T>(peticion: Observable<T>): Promise<T | null> {
    this.loaderService.show();
    try {
      return await firstValueFrom(peticion);
    } catch (err) {
      this.errorService.handleError(err as HttpErrorResponse);
      return null;
    } finally {
      this.loaderService.hide();
    }
  }

  private liberar(): void {
    this.ocupado = false;
    this.cdr.detectChanges();
  }
}
