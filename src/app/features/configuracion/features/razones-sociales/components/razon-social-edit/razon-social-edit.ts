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
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { RazonSocialService } from '../../services/razon-social.service';
import { BancoOpcion, RazonSocial, RazonSocialUpdate } from '../../dtos/razon-social.dto';

/**
 * Edición de una razón social. El RUC, el nombre y la partida registral vienen de SUNAT y quedan
 * en solo lectura: cambiarlos sería registrar otra empresa, no corregir esta.
 */
@Component({
  selector: 'app-razon-social-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './razon-social-edit.html',
  styleUrl: '../razon-social-form.css',
})
export class RazonSocialEditModal implements OnChanges {
  @Input() open = false;
  @Input({ required: true }) razonSocial!: RazonSocial;
  /** Catálogo de bancos: viene con la bandeja, así que el modal no vuelve a pedirlo. */
  @Input() bancos: BancoOpcion[] = [];

  @Output() closed = new EventEmitter<void>();
  /** Emite la fila ya actualizada; el padre la reemplaza en la tabla sin recargar la bandeja. */
  @Output() saved = new EventEmitter<RazonSocial>();

  // Identidad (solo lectura)
  nombre = '';
  ruc = '';
  partidaRegistral = '';

  model: RazonSocialUpdate = this.vacio();
  guardando = false;

  readonly estadoOptions = [
    { id: true, nombre: 'Activa' },
    { id: false, nombre: 'Inactiva' },
  ];

  constructor(
    private service: RazonSocialService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] && this.open) || changes['razonSocial']) this.reset();
  }

  private vacio(): RazonSocialUpdate {
    return { direccion: '', tipoActividad: '', activo: true, esAbril: false, bancoId: null };
  }

  private reset(): void {
    const rs = this.razonSocial;
    if (!rs) {
      this.nombre = '';
      this.ruc = '';
      this.partidaRegistral = '';
      this.model = this.vacio();
      return;
    }

    this.nombre = rs.nombre ?? '';
    this.ruc = rs.ruc ?? '';
    this.partidaRegistral = rs.partidaRegistral ?? '';
    this.model = {
      direccion: rs.direccion ?? '',
      tipoActividad: rs.tipoActividad ?? '',
      activo: rs.activo,
      esAbril: rs.esAbril,
      bancoId: rs.bancoId,
    };
  }

  /**
   * Dejar de ser del grupo se lleva el banco: el backend lo limpia igual, pero mantenerlo en
   * pantalla dejaría un banco elegido en un formulario que ya no lo muestra.
   */
  onEsAbrilChange(valor: boolean): void {
    this.model.esAbril = valor;
    if (!valor) this.model.bancoId = null;
  }

  guardar(): void {
    if (this.guardando) return;

    if (!String(this.model.direccion ?? '').trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa la dirección.' });
      return;
    }

    this.guardando = true;
    this.loaderService.show();
    this.cdr.detectChanges();

    this.service.update(this.razonSocial.id, this.model).subscribe({
      next: (actualizada) => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Razón social actualizada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit(actualizada);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
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
