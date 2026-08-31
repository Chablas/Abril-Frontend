import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ControlLicenciasService } from '../../services/control-licencias.service';
import { FECHA_ESTADO_LABEL, FechaEstado, VecinoLicenciaItemDTO } from '../../dtos/control-licencias.dto';

/** '' = tiene fecha real (se usa el input date); cualquier otro valor = motivo por el que no hay fecha. */
type EstadoSelect = FechaEstado | '';

/** Edita las fechas ampliadas del dashboard gerencial (inscripción/inicio/renovación) y Mes Activo. */
@Component({
  selector: 'app-licencia-fechas',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel],
  templateUrl: './licencia-fechas.html',
})
export class LicenciaFechas implements OnInit {
  @Input({ required: true }) projectId!: number;
  @Input({ required: true }) item!: VecinoLicenciaItemDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();

  readonly estadoOpciones: { value: EstadoSelect; label: string }[] = [
    { value: '', label: 'Con fecha' },
    ...(Object.entries(FECHA_ESTADO_LABEL) as [FechaEstado, string][]).map(([value, label]) => ({ value, label })),
  ];

  fechaInscripcion: string | null = null;
  fechaInscripcionEstado: EstadoSelect = '';
  fechaInicio: string | null = null;
  fechaInicioEstado: EstadoSelect = '';
  fechaVencimientoEstado: EstadoSelect = '';
  fechaRenovacion: string | null = null;
  fechaRenovacionEstado: EstadoSelect = '';
  mesActivo = true;

  constructor(
    private service: ControlLicenciasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.fechaInscripcion = this.item.fechaInscripcion;
    this.fechaInscripcionEstado = this.item.fechaInscripcionEstado ?? '';
    this.fechaInicio = this.item.fechaInicio;
    this.fechaInicioEstado = this.item.fechaInicioEstado ?? '';
    this.fechaVencimientoEstado = this.item.fechaVencimientoEstado ?? '';
    this.fechaRenovacion = this.item.fechaRenovacion;
    this.fechaRenovacionEstado = this.item.fechaRenovacionEstado ?? '';
    this.mesActivo = this.item.mesActivo;
  }

  close(): void {
    this.closeModal.emit();
  }

  guardar(): void {
    this.loaderService.show();
    this.service
      .updateFechas(this.projectId, this.item.vecinoLicenciaControlTipoId, {
        fechaInscripcion: this.fechaInscripcionEstado ? null : this.fechaInscripcion,
        fechaInscripcionEstado: this.fechaInscripcionEstado || null,
        fechaInicio: this.fechaInicioEstado ? null : this.fechaInicio,
        fechaInicioEstado: this.fechaInicioEstado || null,
        fechaVencimientoEstado: this.fechaVencimientoEstado || null,
        fechaRenovacion: this.fechaRenovacionEstado ? null : this.fechaRenovacion,
        fechaRenovacionEstado: this.fechaRenovacionEstado || null,
        mesActivo: this.mesActivo,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.changed.emit();
          this.close();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
