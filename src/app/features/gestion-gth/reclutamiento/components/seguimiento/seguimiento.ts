import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ReclutamientoService } from '../../services/reclutamiento.service';
import { Seguimiento } from '../../dtos/reclutamiento.dto';

/**
 * Modal "Estado del reclutamiento" (solo lectura): cabecera con datos clave del
 * requerimiento + línea de tiempo vertical de las fases del pipeline. Se abre desde
 * el botón "Hacer seguimiento" de la tabla "Mis solicitudes de vacante".
 */
@Component({
  standalone: true,
  selector: 'app-gth-seguimiento',
  imports: [CommonModule, AbrilModalPanel, StatusBadge, TitleCasePipe],
  templateUrl: './seguimiento.html',
})
export class GthSeguimiento implements OnInit {
  /** Id del requerimiento a mostrar. */
  @Input({ required: true }) requerimientoId!: number;
  @Output() closeModal = new EventEmitter<void>();

  seguimiento: Seguimiento | null = null;

  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loaderService.show();
    this.service.getSeguimiento(this.requerimientoId).subscribe({
      next: (data) => {
        this.seguimiento = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  /** Subtítulo del header: "REQ-AAAA-NNNN · Puesto". */
  get subtitulo(): string {
    if (!this.seguimiento) return '';
    const puesto = this.titleCase(this.seguimiento.puesto);
    return puesto ? `${this.seguimiento.codigo} · ${puesto}` : this.seguimiento.codigo;
  }

  /** Etiqueta de la tarjeta "Aprobación GG". */
  get aprobacionGgLabel(): string {
    return this.seguimiento?.aprobacionGgRequerida ? 'Requerido' : 'No requerido';
  }

  private titleCase(value: string | null | undefined): string {
    return value ? new TitleCasePipe().transform(value) : '';
  }
}
