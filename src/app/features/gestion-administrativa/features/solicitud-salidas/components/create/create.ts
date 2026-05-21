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

  formData: SolicitudSalidaFormDataDto = { motivos: [], lugares: [], aprobadorEmail: null };

  createDto: SolicitudSalidaCreateDto = {
    fechaSalida: '',
    horaSalida: '',
    horaRetorno: null,
    motivoId: null,
    motivoLibre: null,
    lugarOrigenId: null,
    lugarOrigenLibre: null,
    lugarDestinoId: null,
    lugarDestinoLibre: null,
  };

  // ── Estado de los pickers de hora ─────────────────────────────────────
  salidaHH = '';
  salidaMM = '';
  retornoHH = '';
  retornoMM = '';
  sinRetorno = false;

  // ── Opciones estáticas ────────────────────────────────────────────────
  readonly TODAS_HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  readonly TODOS_MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  motivoLibreOn = false;
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
    this.setDefaultSalidaTime();
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

  // ── Helpers de fecha/hora ─────────────────────────────────────────────

  private get todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Establece hora de salida con la hora actual exacta. */
  private setDefaultSalidaTime(): void {
    const now = new Date();
    this.salidaHH = String(now.getHours()).padStart(2, '0');
    this.salidaMM = String(now.getMinutes()).padStart(2, '0');
    this.createDto.horaSalida = `${this.salidaHH}:${this.salidaMM}`;
  }

  // ── Opciones disponibles (getters reactivos) ──────────────────────────

  /** Horas válidas para salida: si es hoy, solo >= hora actual. */
  get horasSalidaDisponibles(): string[] {
    if (this.createDto.fechaSalida !== this.todayStr) return this.TODAS_HORAS;
    const nowH = new Date().getHours();
    return this.TODAS_HORAS.filter((h) => parseInt(h) >= nowH);
  }

  /** Minutos válidos para salida: si es hoy y misma hora actual, solo >= minuto actual. */
  get minutosSalidaDisponibles(): string[] {
    if (this.createDto.fechaSalida !== this.todayStr || !this.salidaHH) return this.TODOS_MINUTOS;
    const now = new Date();
    if (parseInt(this.salidaHH) > now.getHours()) return this.TODOS_MINUTOS;
    return this.TODOS_MINUTOS.filter((m) => parseInt(m) >= now.getMinutes());
  }

  /** Horas válidas para retorno: solo >= hora de salida. */
  get horasRetornoDisponibles(): string[] {
    if (!this.salidaHH) return this.TODAS_HORAS;
    return this.TODAS_HORAS.filter((h) => parseInt(h) >= parseInt(this.salidaHH));
  }

  /** Minutos válidos para retorno: si misma hora que salida, solo > minuto de salida. */
  get minutosRetornoDisponibles(): string[] {
    if (!this.retornoHH || !this.salidaHH) return this.TODOS_MINUTOS;
    if (parseInt(this.retornoHH) > parseInt(this.salidaHH)) return this.TODOS_MINUTOS;
    const salM = parseInt(this.salidaMM || '00');
    return this.TODOS_MINUTOS.filter((m) => parseInt(m) > salM);
  }

  // ── Opciones formateadas para app-search-select ───────────────────────

  /** search-select necesita objetos con { valor, label }. */
  private toOptions(items: string[]): { valor: string; label: string }[] {
    return items.map((v) => ({ valor: v, label: v }));
  }

  get horasSalidaOptions()    { return this.toOptions(this.horasSalidaDisponibles); }
  get minutosSalidaOptions()  { return this.toOptions(this.minutosSalidaDisponibles); }
  get horasRetornoOptions()   { return this.toOptions(this.horasRetornoDisponibles); }
  get minutosRetornoOptions() { return this.toOptions(this.minutosRetornoDisponibles); }

  // ── Manejadores de cambio ─────────────────────────────────────────────

  onFechaSalidaChange(fecha: string): void {
    this.createDto.fechaSalida = fecha;
    // Si es hoy y la hora seleccionada ya pasó, limpiar
    if (fecha === this.todayStr && this.createDto.horaSalida) {
      const now = new Date();
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (this.createDto.horaSalida <= nowStr) {
        this.salidaHH = '';
        this.salidaMM = '';
        this.createDto.horaSalida = '';
        this.resetRetorno();
      }
    }
  }

  onSalidaHHChange(hh: string): void {
    this.salidaHH = hh;
    // Si el minuto seleccionado ya no es válido para la nueva hora, limpiar
    if (this.salidaMM && !this.minutosSalidaDisponibles.includes(this.salidaMM)) {
      this.salidaMM = '';
    }
    this.syncSalida();
    this.validateRetornoAfterSalidaChange();
  }

  onSalidaMMChange(mm: string): void {
    this.salidaMM = mm;
    this.syncSalida();
    this.validateRetornoAfterSalidaChange();
  }

  onRetornoHHChange(hh: string): void {
    this.retornoHH = hh;
    // Si el minuto ya no es válido para la nueva hora de retorno, limpiar
    if (this.retornoMM && !this.minutosRetornoDisponibles.includes(this.retornoMM)) {
      this.retornoMM = '';
    }
    this.syncRetorno();
  }

  onRetornoMMChange(mm: string): void {
    this.retornoMM = mm;
    this.syncRetorno();
  }

  onSinRetornoChange(checked: boolean): void {
    this.sinRetorno = checked;
    if (checked) {
      this.retornoHH = '';
      this.retornoMM = '';
      this.createDto.horaRetorno = ''; // '' pasa la validación !== null; se convierte a null al guardar
    } else {
      this.createDto.horaRetorno = null;
    }
  }

  onMotivoLibreChange(checked: boolean): void {
    this.motivoLibreOn = checked;
    this.createDto.motivoId = null;
    this.createDto.motivoLibre = null;
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

  private syncSalida(): void {
    this.createDto.horaSalida =
      this.salidaHH && this.salidaMM ? `${this.salidaHH}:${this.salidaMM}` : '';
  }

  private syncRetorno(): void {
    if (this.sinRetorno) return;
    this.createDto.horaRetorno =
      this.retornoHH && this.retornoMM ? `${this.retornoHH}:${this.retornoMM}` : null;
  }

  private resetRetorno(): void {
    this.retornoHH = '';
    this.retornoMM = '';
    this.sinRetorno = false;
    this.createDto.horaRetorno = null;
  }

  /** Si la hora de retorno quedó <= hora de salida tras un cambio, la limpia. */
  private validateRetornoAfterSalidaChange(): void {
    if (!this.sinRetorno && this.retornoHH && this.retornoMM) {
      const retornoStr = `${this.retornoHH}:${this.retornoMM}`;
      if (this.createDto.horaSalida && retornoStr <= this.createDto.horaSalida) {
        this.resetRetorno();
      }
    }
  }

  // ── Validación y envío ────────────────────────────────────────────────

  private getMissingFields(): string[] {
    const missing: string[] = [];
    if (!this.createDto.fechaSalida) missing.push('Fecha de salida');
    if (!this.createDto.horaSalida) missing.push('Hora de salida');
    if (this.createDto.horaRetorno === null) missing.push('Hora de retorno');
    if (!this.createDto.motivoId && !this.createDto.motivoLibre?.trim())
      missing.push('Motivo');
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
