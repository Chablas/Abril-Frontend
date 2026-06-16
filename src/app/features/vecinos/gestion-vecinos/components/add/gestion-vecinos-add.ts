import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GestionVecinosService } from '../../services/gestion-vecinos.service';
import { VecinoFormOptionsDTO, VecinoCreateDTO } from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-vecinos-add',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './gestion-vecinos-add.html',
})
export class GestionVecinosAdd {
  @Input() options!: VecinoFormOptionsDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  form: VecinoCreateDTO = {
    projectId: null,
    predio: '',
    direccion: '',
    interiorDepartamento: '',
    nombrePropietario: '',
    dni: '',
    celular: '',
    vecinoColindanciaId: null,
    vecinoTipoConstruccionId: null,
  };

  dniLookupLoading = false;
  dniConsulted = false;

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── DNI ───────────────────────────────────────────────────────────
  searchReniec(): void {
    if (this.form.dni.length !== 8) return;
    this.dniLookupLoading = true;
    this.loaderService.show();
    this.service.getPersonByDni(this.form.dni).subscribe({
      next: (data) => {
        this.form.nombrePropietario = data.full_name?.trim()
          || `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim();
        this.dniConsulted = true;
        this.dniLookupLoading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.dniLookupLoading = false;
        this.loaderService.hide();
        if (err.status === 404) {
          Swal.fire({
            icon: 'warning',
            title: 'DNI no encontrado',
            text: 'No se encontró información en RENIEC. Puedes ingresar el nombre manualmente.',
          });
          return;
        }
        // Si RENIEC falla (cuota agotada u otro error), permitir llenado manual.
        Swal.fire({
          icon: 'info',
          title: 'No se pudo consultar RENIEC',
          text: 'Ingresa el nombre del propietario o representante manualmente.',
        });
      },
    });
  }

  onDniKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.searchReniec(); return; }
    this.blockNonDigits(event);
  }

  onNumericKeydown(event: KeyboardEvent): void {
    this.blockNonDigits(event);
  }

  private blockNonDigits(event: KeyboardEvent): void {
    const isControl = event.ctrlKey || event.metaKey || event.altKey;
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (isControl || allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  // ── Validación ─────────────────────────────────────────────────────
  private getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.form.projectId)                  errors.push('Proyecto');
    if (!this.form.direccion?.trim())          errors.push('Dirección');
    if (!this.form.nombrePropietario?.trim())  errors.push('Nombre de propietario o representante');
    if (!this.form.dni?.trim() || this.form.dni.trim().length !== 8 || !/^\d{8}$/.test(this.form.dni.trim()))
      errors.push('DNI (8 dígitos)');
    if (!this.form.vecinoColindanciaId)        errors.push('Colindante / No colindante');
    if (!this.form.vecinoTipoConstruccionId)   errors.push('Tipo de construcción');
    return errors;
  }

  // ── Submit ─────────────────────────────────────────────────────────
  submit(): void {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      const listHtml = errors.map(e => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<p style="font-size:0.85rem;color:#666;margin-bottom:8px">Por favor completa los siguientes campos:</p>
               <ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();
    this.service.create(this.form).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: '¡Vecino registrado!',
          text: res.message ?? 'El vecino fue registrado correctamente.',
          confirmButtonColor: '#64BC04',
        });
        this.created.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
