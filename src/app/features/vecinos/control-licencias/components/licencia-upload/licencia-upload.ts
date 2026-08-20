import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ControlLicenciasService } from '../../services/control-licencias.service';
import { VecinoLicenciaItemDTO } from '../../dtos/control-licencias.dto';

@Component({
  selector: 'app-licencia-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './licencia-upload.html',
})
export class LicenciaUpload {
  @Input({ required: true }) projectId!: number;
  @Input({ required: true }) item!: VecinoLicenciaItemDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<void>();

  fechaVencimiento = '';
  fechaRecordatorio = '';
  selectedFile: File | null = null;

  constructor(
    private service: ControlLicenciasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  get diasAntes(): number | null {
    if (!this.fechaVencimiento || !this.fechaRecordatorio) return null;
    const v = new Date(this.fechaVencimiento).getTime();
    const r = new Date(this.fechaRecordatorio).getTime();
    const dias = Math.round((v - r) / (1000 * 60 * 60 * 24));
    return dias >= 0 ? dias : null;
  }

  /** Al fijar la fecha de vencimiento, sugiere el recordatorio usando los días por defecto del tipo. */
  onFechaVencimientoChange(): void {
    if (!this.fechaVencimiento || this.fechaRecordatorio || this.item.diasAntesDefault == null) return;
    const v = new Date(this.fechaVencimiento);
    v.setDate(v.getDate() - this.item.diasAntesDefault);
    this.fechaRecordatorio = v.toISOString().slice(0, 10);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  close(): void {
    this.closeModal.emit();
  }

  guardar(): void {
    if (!this.selectedFile) {
      Swal.fire({ icon: 'warning', title: 'Adjunta el archivo', confirmButtonColor: '#0F6E56' });
      return;
    }
    if (!this.fechaVencimiento || !this.fechaRecordatorio) {
      Swal.fire({ icon: 'warning', title: 'Completa ambas fechas', confirmButtonColor: '#0F6E56' });
      return;
    }
    if (this.diasAntes === null) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas inválidas',
        text: 'La fecha de recordatorio no puede ser posterior a la de vencimiento.',
        confirmButtonColor: '#0F6E56',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .uploadLicencia(
        this.projectId,
        this.item.vecinoLicenciaControlTipoId,
        { fechaVencimiento: this.fechaVencimiento, fechaRecordatorio: this.fechaRecordatorio, diasAntes: this.diasAntes },
        this.selectedFile,
      )
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.uploaded.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
