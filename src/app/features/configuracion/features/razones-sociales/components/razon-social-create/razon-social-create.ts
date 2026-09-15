import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { RazonSocialService } from '../../services/razon-social.service';
import { BancoOpcion, RazonSocialCreate } from '../../dtos/razon-social.dto';

/**
 * Alta de una razón social. Se arranca por el RUC: los datos de identidad los trae SUNAT y solo se
 * escriben a mano cuando esa consulta no responde.
 *
 * El banco solo se pide cuando la empresa es del grupo: a un contratista o un proveedor no se le
 * abre cuenta sueldo a nadie, y la base lo exige con un CHECK.
 */
@Component({
  selector: 'app-razon-social-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './razon-social-create.html',
  styleUrl: '../razon-social-form.css',
})
export class RazonSocialCreateModal {
  /** Catálogo de bancos: viene con la bandeja, así que el modal no vuelve a pedirlo. */
  @Input() bancos: BancoOpcion[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  rucInput = '';
  /** true tras una consulta a SUNAT exitosa: los datos de identidad quedan en solo lectura. */
  lookupDone = false;
  /** true cuando el usuario decide escribirlo todo a mano (la consulta no responde). */
  manualEntry = false;
  guardando = false;

  model: RazonSocialCreate = this.vacio();

  constructor(
    private service: RazonSocialService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  private vacio(): RazonSocialCreate {
    return {
      ruc: '',
      nombre: '',
      direccion: '',
      tipoActividad: '',
      distrito: '',
      provincia: '',
      departamento: '',
      partidaRegistral: '',
      esAbril: false,
      bancoId: null,
    };
  }

  /** true cuando ya hay algo que llenar (por SUNAT o a mano). */
  get formularioVisible(): boolean {
    return this.lookupDone || this.manualEntry;
  }

  /** Filtra lo tecleado en el RUC: solo dígitos y máximo 11. */
  onRucInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = (input.value ?? '').replace(/\D/g, '').slice(0, 11);
    if (input.value !== limpio) input.value = limpio;
    this.rucInput = limpio;
  }

  consultarRuc(): void {
    const ruc = this.rucInput.trim();
    if (ruc.length !== 11) {
      Swal.fire({ icon: 'error', title: 'RUC inválido', text: 'El RUC debe tener 11 dígitos.' });
      return;
    }

    this.loaderService.show();
    this.service.consultarRuc(ruc).subscribe({
      next: (data) => {
        this.model = {
          ...this.vacio(),
          ruc: data.contributorRuc,
          nombre: data.contributorName,
          direccion: data.contributorAddress,
          tipoActividad: data.contributorEconomicActivityDescription,
          distrito: data.contributorDistrict ?? '',
          provincia: data.contributorProvince ?? '',
          departamento: data.contributorDepartment ?? '',
        };
        this.lookupDone = true;
        this.manualEntry = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        if (err.status === 404) {
          Swal.fire({
            icon: 'error',
            title: 'RUC no encontrado',
            text: 'No se encontró información para el RUC ingresado.',
          });
          return;
        }
        const backendMsg = err.error?.message as string | undefined;
        if (backendMsg) {
          Swal.fire({ icon: 'warning', title: 'No se pudo consultar', text: backendMsg });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  registrarManualmente(): void {
    this.model = { ...this.vacio(), ruc: this.rucInput.trim() };
    this.lookupDone = false;
    this.manualEntry = true;
  }

  /**
   * Dejar de ser del grupo se lleva el banco: el backend lo ignoraría igual, pero mantenerlo en
   * pantalla dejaría un banco elegido en un formulario que ya no lo muestra.
   */
  onEsAbrilChange(valor: boolean): void {
    this.model.esAbril = valor;
    if (!valor) this.model.bancoId = null;
  }

  guardar(): void {
    if (this.guardando) return;

    const requeridos: [keyof RazonSocialCreate, string][] = [
      ['ruc', 'el RUC'],
      ['nombre', 'la razón social'],
      ['direccion', 'la dirección'],
      ['tipoActividad', 'el tipo de actividad'],
      ['departamento', 'el departamento'],
      ['provincia', 'la provincia'],
      ['distrito', 'el distrito'],
    ];
    for (const [campo, etiqueta] of requeridos) {
      if (!String(this.model[campo] ?? '').trim()) {
        Swal.fire({ icon: 'error', title: 'Campo requerido', text: `Ingresa ${etiqueta}.` });
        return;
      }
    }
    if (this.model.ruc.trim().length !== 11) {
      Swal.fire({ icon: 'error', title: 'RUC inválido', text: 'El RUC debe tener 11 dígitos.' });
      return;
    }

    this.guardando = true;
    this.loaderService.show();
    this.cdr.detectChanges();

    this.service.create({ ...this.model, ruc: this.model.ruc.trim() }).subscribe({
      next: () => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Razón social registrada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
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
