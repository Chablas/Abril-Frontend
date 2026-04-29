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
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { InterconsultaService } from '../../../services/interconsulta.service';
import {
  EstadoInterconsulta,
  InterconsultaDetalleDto,
  InterconsultaUpdateDto,
} from '../../../dtos/interconsulta.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  estadoBadgeClass,
  estadoInterconsultaStyle,
} from '../../../shared/estado.utils';

@Component({
  selector: 'app-interconsulta-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './interconsulta-detail.html',
  styleUrl: './interconsulta-detail.css',
})
export class InterconsultaDetail implements OnChanges {
  @Input() interconsultaId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  data: InterconsultaDetalleDto | null = null;
  loading = false;
  saving = false;

  form = {
    fechaAtencion: '',
    diagnostico: '',
    cie10: '',
    resultado: '',
    urlInforme: '',
    estado: '' as EstadoInterconsulta,
    notas: '',
  };

  estadoOptions = [
    { id: 'Pendiente', nombre: 'Pendiente' },
    { id: 'Atendida', nombre: 'Atendida' },
    { id: 'Cancelada', nombre: 'Cancelada' },
  ];

  constructor(
    private service: InterconsultaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['interconsultaId'] && this.interconsultaId) {
      this.load();
    }
  }

  private load(): void {
    if (!this.interconsultaId) return;
    this.loading = true;
    this.loaderService.show();
    this.service.getInterconsulta(this.interconsultaId).subscribe({
      next: (res) => {
        this.data = res;
        this.form = {
          fechaAtencion: res.fechaAtencion?.substring(0, 10) ?? '',
          diagnostico: res.diagnostico ?? '',
          cie10: res.cie10 ?? '',
          resultado: res.resultado ?? '',
          urlInforme: res.urlInforme ?? '',
          estado: res.estado,
          notas: res.notas ?? '',
        };
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  submit(): void {
    if (!this.data) return;

    if (this.form.estado === 'Atendida' && !this.form.fechaAtencion) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha de atención requerida',
        text: 'Registra la fecha de atención para marcar como Atendida.',
      });
      return;
    }

    const payload: InterconsultaUpdateDto = {
      fechaAtencion: this.form.fechaAtencion || undefined,
      diagnostico: this.form.diagnostico || undefined,
      cie10: this.form.cie10 || undefined,
      resultado: this.form.resultado || undefined,
      urlInforme: this.form.urlInforme || undefined,
      estado: this.form.estado || undefined,
      notas: this.form.notas || undefined,
    };

    this.saving = true;
    this.loaderService.show();
    this.service.updateInterconsulta(this.data.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Interconsulta actualizada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  estadoClass(estado: string): string {
    return estadoBadgeClass(estadoInterconsultaStyle(estado));
  }

  close(): void {
    this.closed.emit();
  }
}
