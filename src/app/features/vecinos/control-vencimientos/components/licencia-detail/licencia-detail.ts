import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { VecinoLicenciaDTO } from '../../dtos/control-vencimientos.dto';

/** Detalle de una licencia/permiso: archivo, fechas y correos del recordatorio. */
@Component({
  selector: 'app-licencia-detail',
  standalone: true,
  imports: [CommonModule, BaseModal],
  templateUrl: './licencia-detail.html',
})
export class LicenciaDetail {
  @Input({ required: true }) item!: VecinoLicenciaDTO;
  @Output() closeModal = new EventEmitter<void>();

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  /** Días que faltan para el vencimiento (negativo = ya venció). */
  get diasRestantes(): number {
    const [y, m, d] = this.item.fechaVencimiento.split('-').map(Number);
    const hoy = new Date();
    const venc = Date.UTC(y, m - 1, d);
    const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return Math.round((venc - hoyUtc) / 86400000);
  }
}
