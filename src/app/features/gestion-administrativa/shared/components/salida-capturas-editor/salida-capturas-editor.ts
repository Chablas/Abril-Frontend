import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { DraggableImage } from '../../../../../shared/components/draggable-image/draggable-image';
import { ErrorService } from '../../../../../core/services/error.service';
import { SalidaDetalleService } from '../../services/salida-detalle.service';
import { TrayectoDetalleDto } from '../../dtos/salida-detalle.dto';
import { CapturaFila, CapturaNuevaFila, CapturasEdicion } from './capturas-edicion';

/**
 * Las capturas de movilidad de UN trayecto en edición: las ya subidas —con el monto y la imagen
 * editables en el sitio— y las filas para agregar nuevas.
 *
 * No guarda nada: lo escrito queda en la `CapturasEdicion` de la salida, que el modal manda entera
 * con su único botón de guardar. Lo único que se aplica al toque es quitar una captura: es
 * destructivo, ya se confirma con su propio aviso y dejarlo pendiente obligaría a poder deshacerlo.
 */
@Component({
  standalone: true,
  selector: 'app-salida-capturas-editor',
  imports: [CommonModule, FormsModule, DraggableImage],
  templateUrl: './salida-capturas-editor.html',
  styles: [`:host { display: flex; flex-direction: column; gap: 12px; }`],
})
export class SalidaCapturasEditor {
  @Input({ required: true }) edicion!: CapturasEdicion;
  @Input({ required: true }) trayecto!: TrayectoDetalleDto;

  /** Se dio de baja una captura en el backend: lo guardado de la salida ya no es lo que se cargó. */
  @Output() quitada = new EventEmitter<void>();

  constructor(
    private service: SalidaDetalleService,
    private errorService: ErrorService,
  ) {}

  onElegirImagen(fila: CapturaFila | CapturaNuevaFila, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // deja volver a elegir el mismo archivo
    if (file) this.edicion.elegirImagen(fila, file);
  }

  async quitarCaptura(fila: CapturaFila): Promise<void> {
    if (this.edicion.guardando) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Quitar esta captura?',
      text: `Dejará de contar los S/ ${fila.captura.monto.toFixed(2)} en la planilla.`,
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    this.edicion.guardando = true;
    this.service.eliminarCaptura(fila.captura.id).subscribe({
      next: () => {
        this.edicion.quitarCaptura(this.trayecto.id, fila);
        this.edicion.guardando = false;
        this.quitada.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.edicion.guardando = false;
        this.errorService.handleError(err);
      },
    });
  }
}
