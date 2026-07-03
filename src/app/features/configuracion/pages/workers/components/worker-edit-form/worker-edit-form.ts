import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { WorkerService } from '../../../../../ssoma/salud-ocupacional/services/worker.service';
import {
  DocumentTypeDto,
  EmoPorTrabajadorDto,
  WorkerDatosBasicosDto,
} from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';

interface EditModel {
  nombreCompleto: string;
  documentIdentityTypeId: number | null;
  numeroDocumento: string;
  cumpleanos: string; // 'YYYY-MM-DD'
}

/**
 * Edición mínima de un trabajador (Configuración → Trabajadores). Por ahora solo
 * permite cambiar nombre completo, tipo y número de documento y cumpleaños; todos
 * viven en la tabla `person`, por eso se usa el endpoint dedicado `datos-basicos`
 * que no toca el resto de campos del worker.
 */
@Component({
  selector: 'app-worker-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './worker-edit-form.html',
  styleUrl: './worker-edit-form.css',
})
export class WorkerEditForm implements OnChanges {
  @Input() open = false;
  @Input() worker: EmoPorTrabajadorDto | null = null;
  @Input() documentTypes: DocumentTypeDto[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: EditModel = this.empty();
  saving = false;

  constructor(
    private workerService: WorkerService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  private empty(): EditModel {
    return { nombreCompleto: '', documentIdentityTypeId: null, numeroDocumento: '', cumpleanos: '' };
  }

  private reset(): void {
    if (!this.worker) {
      this.model = this.empty();
      return;
    }
    this.model = {
      nombreCompleto: this.worker.nombreCompleto ?? '',
      documentIdentityTypeId: this.worker.documentIdentityTypeId ?? null,
      numeroDocumento: this.worker.dni ?? '',
      cumpleanos: (this.worker.cumpleanos ?? '').slice(0, 10),
    };
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.model.nombreCompleto?.trim();
  }

  submit(): void {
    if (!this.canSubmit || !this.worker) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'El nombre completo es obligatorio.' });
      return;
    }

    const payload: WorkerDatosBasicosDto = {
      nombreCompleto: this.model.nombreCompleto.trim(),
      documentIdentityTypeId: this.model.documentIdentityTypeId || null,
      numeroDocumento: this.model.numeroDocumento?.trim() || null,
      cumpleanos: this.model.cumpleanos || null,
    };

    this.saving = true;
    this.loaderService.show();

    this.workerService.updateDatosBasicos(this.worker.workerId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Trabajador actualizado',
          timer: 1500,
          showConfirmButton: false,
        });
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

  close(): void {
    this.closed.emit();
  }
}
