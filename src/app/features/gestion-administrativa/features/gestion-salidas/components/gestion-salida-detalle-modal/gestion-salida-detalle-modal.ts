import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { DraggableImage } from '../../../../../../shared/components/draggable-image/draggable-image';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import {
  GestionSalidaDetalleDto,
  GestionSalidaTrayectoDto,
} from '../../dtos/gestion-salida.dto';

@Component({
  standalone: true,
  selector: 'app-gestion-salida-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, DraggableImage, TitleCasePipe],
  templateUrl: './gestion-salida-detalle-modal.html',
})
export class GestionSalidaDetalleModal {
  @Input({ required: true }) detalle!: GestionSalidaDetalleDto;
  @Output() close = new EventEmitter<void>();

  /**
   * La decisión sobre la salida. La pide el modal pero la ejecuta la pantalla, que es la que ya
   * tiene el diálogo de confirmación, el servicio y la recarga de la tabla: acá solo se decide si
   * los botones se muestran.
   */
  @Output() aprobar  = new EventEmitter<void>();
  @Output() rechazar = new EventEmitter<void>();

  /**
   * Los botones existen solo para el revisor de esta salida (`puedeDecidir`, que resuelve el
   * backend) — es a él a quien le llega el correo que cae justamente en este detalle. Al resto
   * (un gerente, recepción, GTH mirando otra rama) el detalle les sale de solo lectura.
   *
   * Encima va el estado, con las mismas reglas que los botones de la tabla: solo lo Pendiente se
   * aprueba, y se rechaza lo Pendiente o lo Aprobado que todavía no se rindió (una vez rendida la
   * aprobación queda firme). El backend re-valida las dos cosas.
   */
  get puedeAprobar(): boolean {
    return this.detalle.puedeDecidir && this.detalle.estadoAprobacion === 'Pendiente';
  }

  get puedeRechazar(): boolean {
    if (!this.detalle.puedeDecidir) return false;
    return this.detalle.estadoAprobacion === 'Pendiente'
      || (this.detalle.estadoAprobacion === 'Aprobado' && this.detalle.estadoRendicion === 'No rendido');
  }

  get totalGeneral(): number {
    return this.detalle.trayectos.reduce((acc, t) => acc + (t.montoTotal || 0), 0);
  }

  totalCapturas(t: GestionSalidaTrayectoDto): number {
    return t.capturas.reduce((acc, c) => acc + (c.monto || 0), 0);
  }

  cerrar(): void {
    this.close.emit();
  }

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      default:          return { bg: '#FEF9C3', text: '#92400E' };
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }

  reembolsoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
      case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }
}
