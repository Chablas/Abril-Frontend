import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { BancoService } from '../../services/banco.service';
import { Banco, BancoUpsert } from '../../dtos/banco.dto';

/**
 * Alta y edición de un banco. Un solo modal para las dos cosas: es el mismo formulario y lo único
 * que cambia es que el código —la clave estable con la que los scripts reconocen al banco— se
 * define al crearlo y después queda en solo lectura.
 */
@Component({
  selector: 'app-banco-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './banco-form.html',
  styleUrl: './banco-form.css',
})
export class BancoForm implements OnInit {
  /** null = alta. Con banco = edición. */
  @Input() banco: Banco | null = null;

  @Output() closed = new EventEmitter<void>();
  /** Emite el banco ya guardado; el padre lo mete o lo reemplaza en la tabla. */
  @Output() saved = new EventEmitter<Banco>();

  model: BancoUpsert = { codigo: '', nombre: '', orden: 0, activo: true };
  guardando = false;

  readonly estadoOptions = [
    { id: true, nombre: 'Activo' },
    { id: false, nombre: 'Inactivo' },
  ];

  constructor(
    private service: BancoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.banco) {
      this.model = {
        codigo: this.banco.codigo,
        nombre: this.banco.nombre,
        orden: this.banco.orden,
        activo: this.banco.activo,
      };
    }
  }

  get esEdicion(): boolean {
    return !!this.banco;
  }

  get titulo(): string {
    return this.esEdicion ? 'Editar banco' : 'Nuevo banco';
  }

  /**
   * El código es un identificador, no un nombre: se normaliza a mayúsculas y se le quitan los
   * caracteres que el backend no acepta mientras se escribe, para no rechazarlo recién al guardar.
   */
  onCodigoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = (input.value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 30);
    if (input.value !== limpio) input.value = limpio;
    this.model.codigo = limpio;
  }

  guardar(): void {
    if (this.guardando) return;

    if (!this.esEdicion && !String(this.model.codigo ?? '').trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa el código del banco.' });
      return;
    }
    if (!this.model.nombre.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa el nombre del banco.' });
      return;
    }

    this.guardando = true;
    this.loaderService.show();
    this.cdr.detectChanges();

    const payload: BancoUpsert = {
      nombre: this.model.nombre.trim(),
      orden: this.model.orden ?? 0,
      activo: this.model.activo,
    };
    // El código solo viaja en el alta: en la edición el backend lo ignora y mandarlo sugeriría que
    // se puede cambiar.
    if (!this.esEdicion) payload.codigo = (this.model.codigo ?? '').trim();

    const peticion = this.esEdicion
      ? this.service.update(this.banco!.id, payload)
      : this.service.create(payload);

    peticion.subscribe({
      next: (guardado) => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.esEdicion ? 'Banco actualizado' : 'Banco registrado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit(guardado);
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
