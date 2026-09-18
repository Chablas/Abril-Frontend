import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { DraggableImage } from '../../../../../shared/components/draggable-image/draggable-image';
import { TrayectoDetalleDto } from '../../dtos/salida-detalle.dto';

/**
 * Los trayectos de una solicitud de salida, en tabla: una fila por trayecto con su horario, su
 * motivo, su recorrido y su monto.
 *
 * Reemplaza a las tarjetas apiladas que había antes en cada detalle. Con varios trayectos, las
 * tarjetas obligaban a bajar por toda la pantalla para comparar dos recorridos o dos montos; en
 * tabla se leen de corrido y en el mismo orden en el que salen impresos en la planilla.
 *
 * Las capturas de movilidad viven DENTRO de la fila de su trayecto: si un trayecto tiene varias,
 * se ven todas (imagen + monto) y la fila crece lo que haga falta. Ninguna se recorta ni se
 * esconde detrás de un contador: el revisor tiene que poder contrastar cada voucher con su monto.
 *
 * Es solo de lectura. La edición de capturas y montos sigue siendo un formulario
 * (`app-salida-capturas-editor`), no una tabla.
 *
 * Lo usan el detalle compartido del módulo (`app-salida-detalle-modal`, que abren Solicitud de
 * Salidas, Mis Rendiciones, Gestión de Rendiciones, Consolidados y Reembolsos) y el detalle propio
 * de Gestión de Salidas. Por eso vive en el shared del módulo.
 */
@Component({
  standalone: true,
  selector: 'app-salida-trayectos-tabla',
  imports: [CommonModule, DraggableImage],
  templateUrl: './salida-trayectos-tabla.html',
  styles: [`
    :host { display: block; }

    /* Las filas crecen con sus capturas: sin esto, el horario y el monto de un trayecto con
       cuatro vouchers quedan centrados a media altura, lejos de su propia fila. */
    .abril-table td { vertical-align: top; }

    /* La regla global de .abril-table tbody tr trae cursor:pointer porque en los listados la
       fila se clickea. Acá no se clickea nada. */
    .abril-table tbody tr { cursor: default; }

    /* La columna de capturas es la que puede crecer; el resto se queda en su ancho natural. */
    .col-capturas { min-width: 210px; }
  `],
})
export class SalidaTrayectosTabla {
  /**
   * Los trayectos tal como los sirve el backend. El tipo de Gestión de Salidas
   * (`GestionSalidaTrayectoDto`) es idéntico campo por campo, así que entra acá sin conversión.
   */
  @Input({ required: true }) trayectos: TrayectoDetalleDto[] = [];

  /**
   * Coletilla que acompaña al monto del catálogo, porque no dice lo mismo en cada pantalla: al
   * dueño de la salida le importa que no tiene que subir captura; a quien revisa, de dónde salió
   * ese monto. Vacío = solo se imprime el monto.
   */
  @Input() catalogoNota = '';

  /**
   * La columna de adjuntos solo existe si algún trayecto trae documentos. Son la excepción (solo
   * los motivos que piden documento), así que dejarla fija llenaba la tabla de guiones y le robaba
   * ancho a lo que sí se mira.
   */
  get hayAdjuntos(): boolean {
    return this.trayectos.some((t) => t.adjuntos.length > 0);
  }

  totalCapturas(t: TrayectoDetalleDto): number {
    return t.capturas.reduce((acc, c) => acc + (c.monto || 0), 0);
  }

  /**
   * El monto sale del catálogo `ga_trayecto` y no de las capturas. Se marca en la fila para que no
   * se lea como un importe cargado por el trabajador.
   */
  esMontoDeCatalogo(t: TrayectoDetalleDto): boolean {
    return this.totalCapturas(t) === 0 && t.montoCatalogo !== null;
  }
}
