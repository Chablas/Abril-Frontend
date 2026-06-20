import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../shared/components/file-selector/file-selector';
import { MiSaludService } from './mi-salud.service';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-mi-salud-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BaseModal, FileSelector],
  templateUrl: './mi-salud-modal.component.html',
  styleUrl: './mi-salud-modal.component.css',
})
export class MiSaludModalComponent implements OnDestroy {
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  saving = false;

  tipo             = 'Particular';
  fechaInicio      = new Date().toISOString().slice(0, 10);
  fechaFin         = new Date().toISOString().slice(0, 10);
  motivo           = '';
  diagnostico      = '';
  diagnosticoCie10 = '';
  documento        : File | null = null;
  documentoNombre  = '';

  readonly tipoOpts = [
    { id: 'Particular',  label: 'Particular' },
    { id: 'Ocupacional', label: 'Ocupacional' },
  ];

  get diasCalculados(): number {
    const ini = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    const diff = Math.round((fin.getTime() - ini.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }

  constructor(
    private svc         : MiSaludService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr         : ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {}

  onFileSelected(sf: SelectedFile): void {
    this.documento      = sf.file;
    this.documentoNombre = sf.file.name;
    this.cdr.detectChanges();
  }

  quitarDocumento(): void {
    this.documento      = null;
    this.documentoNombre = '';
    this.cdr.detectChanges();
  }

  guardar(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Ingresa las fechas del descanso.' });
      return;
    }
    if (new Date(this.fechaFin) < new Date(this.fechaInicio)) {
      Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha fin no puede ser anterior a la fecha inicio.' });
      return;
    }

    this.saving = true;
    this.loaderService.show();

    this.svc.createDescanso({
      tipo: this.tipo,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      dias: this.diasCalculados,
      motivo: this.motivo || null,
      diagnostico: this.diagnostico || null,
      diagnosticoCie10: this.diagnosticoCie10 || null,
    }, this.documento).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Descanso registrado', text: res.message, timer: 2500, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
