import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { EmoService } from '../../../../ssoma/salud-ocupacional/services/emo.service';
import { CatalogosSaludService } from '../../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmoPorTrabajadorDto } from '../../../../ssoma/salud-ocupacional/dtos/emo.model';
import {
  ClinicaSimpleDto,
  EmoTipoDto,
  MedicoSimpleDto,
} from '../../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { ErrorService } from '../../../../../core/services/error.service';

@Component({
  selector: 'app-programar-emo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './programar-emo-dialog.html',
  styleUrl: './programar-emo-dialog.css',
})
export class ProgramarEmoDialogComponent implements OnInit {
  @Input() worker!: EmoPorTrabajadorDto;
  @Output() closed = new EventEmitter<boolean>();

  tiposEmo: EmoTipoDto[] = [];
  clinicas: ClinicaSimpleDto[] = [];
  medicos: MedicoSimpleDto[] = [];

  form = {
    fechaEmo: '',
    tipoEmoId: 0,
    clinicaId: 0,
    medicoId: 0,
    notas: '',
  };

  submitting = false;

  constructor(
    private emoService: EmoService,
    private catalogos: CatalogosSaludService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.catalogos.getEmoTipos().subscribe({ next: (list) => (this.tiposEmo = list) });
    this.catalogos
      .getClinicas()
      .subscribe({ next: (list) => (this.clinicas = list.filter((c) => c.activo)) });
    this.catalogos
      .getMedicos()
      .subscribe({ next: (list) => (this.medicos = list.filter((m) => m.activo)) });
  }

  get canSubmit(): boolean {
    return !!(this.form.fechaEmo && this.form.tipoEmoId && this.form.clinicaId);
  }

  submit(): void {
    if (!this.canSubmit || this.submitting) return;

    this.submitting = true;
    this.emoService
      .createEmo({
        workerId: this.worker.workerId,
        tipoEmoId: this.form.tipoEmoId,
        fechaEmo: this.form.fechaEmo,
        clinicaId: this.form.clinicaId || undefined,
        medicoId: this.form.medicoId || undefined,
        notas: this.form.notas || undefined,
        aptitud: 'Pendiente',
        requiereInterconsulta: false,
        examenes: [],
        restricciones: [],
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          Swal.fire({
            icon: 'success',
            title: 'EMO programado',
            text: 'El EMO fue programado correctamente.',
            timer: 2000,
            showConfirmButton: false,
          });
          this.closed.emit(true);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          this.errorService.handleError(err);
        },
      });
  }

  close(): void {
    this.closed.emit(false);
  }
}
