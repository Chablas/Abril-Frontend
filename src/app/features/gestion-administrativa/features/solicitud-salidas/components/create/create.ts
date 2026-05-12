import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SolicitudSalidasService } from '../../services/solicitud-salidas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SolicitudSalidaFormDataDto } from '../../dtos/solicitud-salida-form-data.dto';
import { SolicitudSalidaCreateDto } from '../../dtos/solicitud-salida-create.dto';

interface HoraOption { valor: string; label: string; }

@Component({
  standalone: true,
  selector: 'app-solicitud-salida-create',
  imports: [BaseModal, CommonModule, FormsModule, SearchSelect],
  templateUrl: './create.html',
  styleUrl: './create.css',
})
export class SolicitudSalidaCreate implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  formData: SolicitudSalidaFormDataDto = { horas: [], motivos: [], lugares: [] };

  createDto: SolicitudSalidaCreateDto = {
    fechaSalida: '',
    horaSalida: '',
    horaRetorno: null,
    motivoId: 0,
    lugarOrigenId: null,
    lugarOrigenLibre: null,
    lugarDestinoId: null,
    lugarDestinoLibre: null,
  };

  origenLibre = false;
  destinoLibre = false;
  submitted = false;

  constructor(
    private service: SolicitudSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.createDto.fechaSalida = this.todayStr;
    setTimeout(() => this.loadFormData());
  }

  loadFormData(): void {
    this.loaderService.show();
    this.service.getFormData().subscribe({
      next: (data) => {
        this.formData = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Helpers de fecha/hora ───────────────────────────────────────────

  private get todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private get currentTimeStr(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ── Opciones de hora ────────────────────────────────────────────────

  /** Horas disponibles para salida: si es hoy, solo las futuras. */
  get horasSalida(): HoraOption[] {
    const all = this.formData.horas.map((h) => ({ valor: h.etiqueta, label: h.etiqueta }));
    if (this.createDto.fechaSalida === this.todayStr) {
      const now = this.currentTimeStr;
      return all.filter((h) => h.valor > now);
    }
    return all;
  }

  /** Horas disponibles para retorno: solo las posteriores a horaSalida + "Sin retorno" al final. */
  get horasRetorno(): HoraOption[] {
    const salida = this.createDto.horaSalida;
    const filtered = this.formData.horas
      .filter((h) => !salida || h.etiqueta > salida)
      .map((h) => ({ valor: h.etiqueta, label: h.etiqueta }));
    return [...filtered, { valor: '', label: 'Sin retorno' }];
  }

  // ── Manejadores de cambio ───────────────────────────────────────────

  onFechaSalidaChange(fecha: string): void {
    this.createDto.fechaSalida = fecha;
    if (fecha === this.todayStr && this.createDto.horaSalida) {
      if (this.createDto.horaSalida <= this.currentTimeStr) {
        this.createDto.horaSalida = '';
        this.createDto.horaRetorno = null;
      }
    }
  }

  onHoraSalidaChange(valor: string): void {
    this.createDto.horaSalida = valor;
    const retorno = this.createDto.horaRetorno;
    if (retorno && retorno <= valor) {
      this.createDto.horaRetorno = null;
    }
  }

  onOrigenLibreChange(checked: boolean): void {
    this.origenLibre = checked;
    this.createDto.lugarOrigenId = null;
    this.createDto.lugarOrigenLibre = null;
  }

  onDestinoLibreChange(checked: boolean): void {
    this.destinoLibre = checked;
    this.createDto.lugarDestinoId = null;
    this.createDto.lugarDestinoLibre = null;
  }

  // ── Validación y envío ──────────────────────────────────────────────

  private getMissingFields(): string[] {
    const missing: string[] = [];
    if (!this.createDto.fechaSalida) missing.push('Fecha de salida');
    if (!this.createDto.horaSalida) missing.push('Hora de salida');
    if (this.createDto.horaRetorno === null) missing.push('Hora de retorno');
    if (!this.createDto.motivoId) missing.push('Motivo');
    if (!this.createDto.lugarOrigenId && !this.createDto.lugarOrigenLibre?.trim())
      missing.push('Lugar de origen');
    if (!this.createDto.lugarDestinoId && !this.createDto.lugarDestinoLibre?.trim())
      missing.push('Lugar de destino');
    return missing;
  }

  get mismosLugares(): boolean {
    return (
      !!this.createDto.lugarOrigenId &&
      !!this.createDto.lugarDestinoId &&
      this.createDto.lugarOrigenId === this.createDto.lugarDestinoId
    );
  }

  save(): void {
    this.submitted = true;
    const missing = this.getMissingFields();
    if (missing.length > 0) {
      Swal.fire({
        title: 'Campos requeridos',
        html: `<ul class="text-left text-sm list-disc pl-4">${missing.map((f) => `<li>${f}</li>`).join('')}</ul>`,
        icon: 'warning',
        confirmButtonColor: '#64BC04',
      });
      return;
    }
    if (this.mismosLugares) {
      Swal.fire({
        title: 'Lugares inválidos',
        text: 'El lugar de origen y el lugar de destino no pueden ser iguales.',
        icon: 'warning',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    // '' (Sin retorno) → null antes del POST
    const payload: SolicitudSalidaCreateDto = {
      ...this.createDto,
      horaRetorno: this.createDto.horaRetorno || null,
    };

    this.loaderService.show();
    this.service.create(payload).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
