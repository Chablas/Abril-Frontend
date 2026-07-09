import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import {
  CatalogoDTO,
  ReunionAcuerdoDTO,
  ReunionParticipanteDTO,
} from '../../dtos/actas-reunion.dto';

@Component({
  selector: 'app-acuerdo-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker, SearchSelect],
  templateUrl: './acuerdo-form.html',
})
export class AcuerdoForm implements OnInit {
  @Input({ required: true }) reunionId!: number;
  @Input() participantes: ReunionParticipanteDTO[] = [];
  @Input() estados: CatalogoDTO[] = [];
  /** Null = crear un acuerdo nuevo; con valor = editar. */
  @Input() acuerdo: ReunionAcuerdoDTO | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  descripcion = '';
  acciones = '';
  fechaProgramada: string | null = null;
  fechaReprogramacion: string | null = null;
  fechaCumplimiento: string | null = null;
  estadoId: number | null = null;
  responsableIds = new Set<number>();

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  get esEdicion(): boolean {
    return this.acuerdo != null;
  }

  ngOnInit(): void {
    if (this.acuerdo) {
      this.descripcion = this.acuerdo.descripcion;
      this.acciones = this.acuerdo.acciones ?? '';
      this.fechaProgramada = this.acuerdo.fechaProgramada;
      this.fechaReprogramacion = this.acuerdo.fechaReprogramacion;
      this.fechaCumplimiento = this.acuerdo.fechaCumplimiento;
      this.estadoId = this.acuerdo.reunionAcuerdoEstadoId;
      this.responsableIds = new Set(this.acuerdo.responsableIds);
    }
  }

  toggleResponsable(participanteId: number): void {
    if (this.responsableIds.has(participanteId)) this.responsableIds.delete(participanteId);
    else this.responsableIds.add(participanteId);
  }

  submit(): void {
    if (!this.descripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'La descripción del acuerdo es obligatoria.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const request = {
      descripcion: this.descripcion.trim(),
      acciones: this.acciones.trim() || null,
      fechaProgramada: this.fechaProgramada,
      fechaReprogramacion: this.fechaReprogramacion,
      fechaCumplimiento: this.fechaCumplimiento,
      reunionAcuerdoEstadoId: this.estadoId,
      responsableIds: [...this.responsableIds],
    };

    this.loaderService.show();
    const obs = this.esEdicion
      ? this.service.actualizarAcuerdo(this.acuerdo!.reunionAcuerdoId, request)
      : this.service.crearAcuerdo(this.reunionId, request);

    obs.subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.esEdicion ? '¡Acuerdo actualizado!' : '¡Acuerdo registrado!',
          confirmButtonColor: 'var(--color-abril-primary)',
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
