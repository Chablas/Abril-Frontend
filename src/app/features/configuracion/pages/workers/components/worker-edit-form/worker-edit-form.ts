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
  EmoPorTrabajadorDto,
  WorkerUpsertDto,
} from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';

@Component({
  selector: 'app-worker-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './worker-edit-form.html',
  styleUrl: './worker-edit-form.css',
})
export class WorkerEditForm implements OnChanges {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'edit';
  @Input() worker: EmoPorTrabajadorDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: WorkerUpsertDto = this.empty();
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

  private empty(): WorkerUpsertDto {
    return {
      apellidoNombre: '',
      dni: '',
      celular: '',
      emailPersonal: '',
      categoria: '',
      ocupacion: '',
      area: '',
      subarea: '',
      contrataCasa: '',
      obraOficina: '',
      jefatura: '',
      sctr: false,
      habilitadoObra: false,
      notas: '',
    };
  }

  private reset(): void {
    if (this.mode === 'create' || !this.worker) {
      this.model = this.empty();
      return;
    }
    this.model = {
      apellidoNombre: this.worker.nombreCompleto ?? '',
      dni: this.worker.dni ?? '',
      celular: this.worker.celular ?? '',
      emailPersonal: this.worker.emailPersonal ?? '',
      categoria: this.worker.categoria ?? '',
      ocupacion: this.worker.ocupacion ?? '',
      area: this.worker.area ?? '',
      subarea: this.worker.subarea ?? '',
      contrataCasa: this.worker.contrataCasa ?? this.worker.tipoContrata ?? '',
      obraOficina: this.worker.obraOficina ?? '',
      jefatura: this.worker.jefatura ?? '',
      sctr: this.worker.sctr ?? false,
      habilitadoObra: this.worker.habilitadoObra ?? false,
      notas: this.worker.notas ?? '',
    };
  }

  get title(): string {
    return this.mode === 'create' ? 'Nuevo trabajador' : 'Editar trabajador';
  }

  get dniReadonly(): boolean {
    return this.mode === 'edit';
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (!this.model.apellidoNombre?.trim()) return false;
    if (this.mode === 'create' && !this.model.dni?.toString().trim()) return false;
    return true;
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text:
          this.mode === 'create'
            ? 'Apellido/Nombre y DNI son obligatorios.'
            : 'Falta el nombre del trabajador.',
      });
      return;
    }

    const payload: WorkerUpsertDto = {
      apellidoNombre: this.model.apellidoNombre.trim(),
      dni: this.model.dni?.toString().trim() || undefined,
      celular: this.normalize(this.model.celular),
      emailPersonal: this.normalize(this.model.emailPersonal),
      categoria: this.normalize(this.model.categoria),
      ocupacion: this.normalize(this.model.ocupacion),
      area: this.normalize(this.model.area),
      subarea: this.normalize(this.model.subarea),
      contrataCasa: this.normalize(this.model.contrataCasa),
      obraOficina: this.normalize(this.model.obraOficina),
      jefatura: this.normalize(this.model.jefatura),
      sctr: !!this.model.sctr,
      habilitadoObra: !!this.model.habilitadoObra,
      notas: this.normalize(this.model.notas),
    };

    this.saving = true;
    this.loaderService.show();

    const req$ =
      this.mode === 'edit' && this.worker
        ? this.workerService.updateWorker(this.worker.workerId, payload)
        : this.workerService.createWorker(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.mode === 'create' ? 'Trabajador creado' : 'Trabajador actualizado',
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

  private normalize(value: string | null | undefined): string | null {
    const v = (value ?? '').toString().trim();
    return v.length ? v : null;
  }

  close(): void {
    this.closed.emit();
  }
}
