import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SalidaDetalleService } from '../../../../shared/services/salida-detalle.service';
import { SolicitudSalidaDetalleDto } from '../../../../shared/dtos/salida-detalle.dto';
import { SalidaCapturasEditor } from '../../../../shared/components/salida-capturas-editor/salida-capturas-editor';
import { CapturasEdicion } from '../../../../shared/components/salida-capturas-editor/capturas-edicion';

/**
 * Corregir las capturas de movilidad de una salida al subsanar una rendición OBSERVADA en primera
 * revisión, que es cuando el jefe pidió corregir capturas y montos. Trayecto por trayecto: las que
 * ya están cargadas, con su monto y su imagen editables en el sitio, y filas para agregar nuevas.
 *
 * Todo se guarda con UN solo botón al pie, en una sola llamada (una sola resolución de la carpeta
 * de SharePoint y un solo SaveChanges). La única excepción es quitar una captura, que es
 * destructivo, se confirma aparte y por eso se aplica al toque.
 *
 * La edición en sí (filas, tope por trayecto, qué se manda) es la misma que la del detalle de
 * Solicitud de Salidas y vive en el shared del módulo (`CapturasEdicion` + `app-salida-capturas-editor`).
 */
@Component({
  standalone: true,
  selector: 'app-salida-capturas-modal',
  imports: [CommonModule, BaseModal, SalidaCapturasEditor],
  templateUrl: './salida-capturas-modal.html',
})
export class SalidaCapturasModal implements OnInit, OnDestroy {
  @Input({ required: true }) solicitudId!: number;

  /** Emite al cerrar: `true` si algo cambió (el padre debe recargar el listado). */
  @Output() close = new EventEmitter<boolean>();

  detalle: SolicitudSalidaDetalleDto | null = null;
  edicion: CapturasEdicion | null = null;

  /**
   * True cuando se guardó o quitó alguna captura en esta sesión del modal. Sirve para que el padre
   * recargue el detalle de la planilla (los montos salen de las capturas) solo si algo cambió.
   */
  private algoCambio = false;

  constructor(
    private service: SalidaDetalleService,
    private loader: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.edicion?.liberar();
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.solicitudId).subscribe({
      next: (data) => {
        this.aplicarDetalle(data);
        this.loader.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(this.algoCambio);
      },
    });
  }

  /** Repinta el modal con el detalle que devolvió el backend y deja la edición en cero. */
  private aplicarDetalle(data: SolicitudSalidaDetalleDto): void {
    this.edicion?.liberar();
    this.detalle = data;
    // Sin fila nueva de entrada: al subsanar se corrige lo que ya está, y las filas nuevas se piden
    // con "Agregar otra captura".
    this.edicion = new CapturasEdicion(data, false);
  }

  cerrar(): void {
    this.close.emit(this.algoCambio);
  }

  onCapturaQuitada(): void {
    this.algoCambio = true;
  }

  /**
   * Manda el modal entero en una sola llamada: las capturas nuevas de todos los trayectos y los
   * montos e imágenes corregidos de las que ya estaban.
   *
   * Guardar CIERRA el modal: lo que sigue al corregir una salida es corregir la siguiente o volver
   * a generar la planilla, y las dos cosas están en el detalle de la rendición que quedó detrás.
   * Dejarlo abierto obligaba a cerrarlo a mano para ver si los montos de la planilla ya cuadraban.
   * El padre recibe el aviso de cambio y recarga ese detalle.
   */
  guardarTodo(): void {
    const edicion = this.edicion;
    if (!edicion?.puedeGuardar) return;

    const total = edicion.totalPendientes;

    edicion.guardando = true;
    this.loader.show();
    this.service
      .guardarCapturas(this.solicitudId, edicion.nuevasParaSubir, edicion.edicionesParaGuardar)
      .subscribe({
        next: () => {
          this.algoCambio = true;
          this.loader.hide();
          Swal.fire({
            icon: 'success',
            title: `${total} cambio${total === 1 ? '' : 's'} guardado${total === 1 ? '' : 's'}`,
            timer: 1800,
            showConfirmButton: false,
          });
          this.close.emit(true);
        },
        error: (err: HttpErrorResponse) => {
          edicion.guardando = false;
          this.loader.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
