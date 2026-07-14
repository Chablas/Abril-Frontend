import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { FileSelector, SelectedFile } from '../../../../shared/components/file-selector/file-selector';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { MiSaludService } from './mi-salud.service';
import { DescansoMotivoDto } from './mi-salud.dtos';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-mi-salud-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilModalPanel, FileSelector, SearchSelect],
  templateUrl: './mi-salud-modal.component.html',
  styleUrl: './mi-salud-modal.component.css',
})
export class MiSaludModalComponent {
  /** Catálogo de motivos (ss_descanso_motivo); llega con el resumen para no hacer otra petición. */
  @Input() motivos: DescansoMotivoDto[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  saving = false;

  fechaInicio = new Date().toISOString().slice(0, 10);
  fechaFin    = new Date().toISOString().slice(0, 10);
  motivoId    : number | null = null;
  diagnostico = '';
  documentos  : File[] = [];

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

  onFileSelected(sf: SelectedFile): void {
    this.documentos = [...this.documentos, sf.file];
    this.cdr.detectChanges();
  }

  quitarDocumento(index: number): void {
    this.documentos = this.documentos.filter((_, i) => i !== index);
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
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      dias: this.diasCalculados,
      motivoId: this.motivoId,
      diagnostico: this.diagnostico || null,
    }, this.documentos).subscribe({
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
