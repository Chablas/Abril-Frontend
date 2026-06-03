import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { PasoEjecucionService } from '../../services/paso-ejecucion.service';
import { PasoActividadDto, PasoEjecucionDto, CreateEjecucionDto } from '../../dtos/paso.dtos';

@Component({
  selector: 'app-ejecucion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './ejecucion-modal.component.html',
  styleUrl: './ejecucion-modal.component.css',
})
export class EjecucionModalComponent implements OnInit {
  @Input() actividad!: PasoActividadDto;
  @Output() closed = new EventEmitter<void>();
  @Output() ejecucionCreada = new EventEmitter<PasoEjecucionDto>();

  form: CreateEjecucionDto = {
    actividadId: 0,
    fechaEjecutada: '',
    observaciones: '',
    participantesCount: undefined,
  };

  evidenciaFile: File | null = null;
  isDragOver = false;
  saving = false;
  uploadProgress = false;

  ngOnInit(): void {
    this.form.actividadId = this.actividad.id;
  }

  constructor(
    private ejecucionService: PasoEjecucionService,
    private cdr: ChangeDetectorRef,
  ) {}

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.evidenciaFile = input.files[0];
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.evidenciaFile = file;
  }

  removeFile(): void {
    this.evidenciaFile = null;
  }

  get canSave(): boolean {
    return !!this.form.fechaEjecutada;
  }

  guardar(): void {
    if (!this.canSave) return;
    this.saving = true;
    this.ejecucionService.create(this.form).subscribe({
      next: (ejecucion) => {
        if (this.evidenciaFile) {
          this.uploadProgress = true;
          this.ejecucionService.subirEvidencia(ejecucion.id, this.evidenciaFile).subscribe({
            next: (updated) => {
              this.saving = false;
              this.uploadProgress = false;
              this.ejecucionCreada.emit(updated);
              this.cdr.detectChanges();
            },
            error: (err: HttpErrorResponse) => {
              this.saving = false;
              this.uploadProgress = false;
              Swal.fire('Advertencia', 'Ejecución guardada, pero falló la carga de evidencia.', 'warning');
              this.ejecucionCreada.emit(ejecucion);
              this.cdr.detectChanges();
            },
          });
        } else {
          this.saving = false;
          this.ejecucionCreada.emit(ejecucion);
          this.cdr.detectChanges();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        Swal.fire('Error', err.error?.message ?? 'No se pudo registrar la ejecución', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
