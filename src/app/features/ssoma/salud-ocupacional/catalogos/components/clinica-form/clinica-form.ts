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
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { ClinicaSimpleDto, ClinicaUpsertDto } from '../../../dtos/catalogos.model';

@Component({
  selector: 'app-clinica-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './clinica-form.html',
  styleUrl: './clinica-form.css',
})
export class ClinicaForm implements OnChanges {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initial: ClinicaSimpleDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: ClinicaUpsertDto = this.empty();
  saving = false;

  constructor(
    private service: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  private empty(): ClinicaUpsertDto {
    return {
      nombre: '',
      ruc: '',
      email: '',
      telefono: '',
      direccion: '',
      activo: true,
    };
  }

  private reset(): void {
    if (this.mode === 'edit' && this.initial) {
      this.model = {
        nombre: this.initial.nombre,
        ruc: this.initial.ruc ?? '',
        email: this.initial.email ?? '',
        telefono: this.initial.telefono ?? '',
        direccion: this.initial.direccion ?? '',
        activo: this.initial.activo,
      };
    } else {
      this.model = this.empty();
    }
  }

  get title(): string {
    return this.mode === 'edit' ? 'Editar clínica' : 'Nueva clínica';
  }

  get canSubmit(): boolean {
    return !!this.model.nombre.trim() && !this.saving;
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({ icon: 'warning', title: 'Falta el nombre de la clínica' });
      return;
    }
    const payload: ClinicaUpsertDto = {
      nombre: this.model.nombre.trim(),
      ruc: this.model.ruc?.toString().trim() || null,
      email: this.model.email?.toString().trim() || null,
      telefono: this.model.telefono?.toString().trim() || null,
      direccion: this.model.direccion?.toString().trim() || null,
      activo: this.model.activo ?? true,
    };

    this.saving = true;
    this.loaderService.show();
    const req$ =
      this.mode === 'edit' && this.initial
        ? this.service.updateClinica(this.initial.id, payload)
        : this.service.createClinica(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.mode === 'edit' ? 'Clínica actualizada' : 'Clínica creada',
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
