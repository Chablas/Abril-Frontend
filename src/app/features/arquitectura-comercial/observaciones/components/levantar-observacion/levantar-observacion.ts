import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { ObservacionesService } from '../../../../../core/services/arquitectura-comercial/observaciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ObservacionListItemDTO } from '../../../../../core/dtos/arquitectura-comercial/observaciones.model';

@Component({
  standalone: true,
  selector: 'app-levantar-observacion',
  imports: [BaseModal, CommonModule, FormsModule],
  templateUrl: './levantar-observacion.html',
})
export class LevantarObservacion {
  @Input({ required: true }) observacion!: ObservacionListItemDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  comentario = '';
  foto: File | null = null;
  fotoPreviewUrl: string | null = null;

  constructor(
    private service: ObservacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.foto = file;
    this.fotoPreviewUrl = file ? URL.createObjectURL(file) : null;
  }

  save(): void {
    this.loaderService.show();
    this.service.levantarObservacion(this.observacion.id, this.comentario.trim() || null, this.foto).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: 'Observación levantada', icon: 'success', timer: 2000 });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
