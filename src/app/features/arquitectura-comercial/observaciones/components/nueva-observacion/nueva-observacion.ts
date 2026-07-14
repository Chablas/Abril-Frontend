import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ObservacionesService } from '../../../../../core/services/arquitectura-comercial/observaciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ProyectoFiltroDTO } from '../../../../../core/dtos/arquitectura-comercial/observaciones.model';

@Component({
  standalone: true,
  selector: 'app-nueva-observacion',
  imports: [BaseModal, CommonModule, FormsModule, SearchSelect],
  templateUrl: './nueva-observacion.html',
})
export class NuevaObservacion {
  @Input() proyectos: ProyectoFiltroDTO[] = [];
  @Input() partidas: string[] = ['Pintura', 'Limpieza', 'Accesorios', 'Otros'];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  get partidaOptions(): { value: string; label: string }[] {
    return this.partidas.map((p) => ({ value: p, label: p }));
  }

  proyectoId: number | null = null;
  fecha = new Date().toISOString().slice(0, 10);
  personaReporta = '';
  empresaReporta = '';
  lugar = '';
  descripcion = '';
  partidaReportada: string | null = null;
  plazoLevantamiento = '';
  foto: File | null = null;
  fotoPreviewUrl: string | null = null;

  submitted = false;

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
    this.submitted = true;
    if (!this.proyectoId || !this.descripcion.trim()) return;

    this.loaderService.show();
    this.service
      .createObservacion(
        {
          proyectoId: this.proyectoId,
          fecha: this.fecha,
          personaReporta: this.personaReporta.trim() || null,
          empresaReporta: this.empresaReporta.trim() || null,
          lugar: this.lugar.trim() || null,
          descripcion: this.descripcion.trim(),
          partidaReportada: this.partidaReportada,
          plazoLevantamiento: this.plazoLevantamiento || null,
        },
        this.foto,
      )
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ title: `Observación ${res.codigo} creada`, icon: 'success', timer: 2000 });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
