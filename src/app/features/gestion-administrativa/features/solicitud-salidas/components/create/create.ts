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
import { SolicitudSalidaCreateDto, TrayectoCreateDto } from '../../dtos/solicitud-salida-create.dto';

/** Estado en memoria de un trayecto en el form (las horas se mantienen como HH/MM por separado). */
interface TrayectoForm {
  salidaHH: string;
  salidaMM: string;
  retornoHH: string;
  retornoMM: string;
  sinRetorno: boolean;
  motivoId: number | null;
  motivoLibre: string | null;
  motivoLibreOn: boolean;
  /** Origen solo es editable en el primer trayecto. */
  lugarOrigenId: number | null;
  lugarOrigenLibre: string | null;
  origenLibre: boolean;
  /** Texto display del origen autocalculado en trayectos posteriores (solo lectura). */
  origenAutoLabel: string;
  lugarDestinoId: number | null;
  lugarDestinoLibre: string | null;
  destinoLibre: boolean;
}

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

  fechaSalida = '';
  trayectos: TrayectoForm[] = [];

  readonly TODAS_HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  readonly TODOS_MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  submitted = false;

  constructor(
    private service: SolicitudSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.fechaSalida = this.todayStr;
    this.trayectos.push(this.nuevoTrayecto(true));
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

  // ── Helpers ────────────────────────────────────────────────────────

  private get todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private nuevoTrayecto(esPrimero: boolean): TrayectoForm {
    const now = new Date();
    return {
      salidaHH: esPrimero ? String(now.getHours()).padStart(2, '0') : '',
      salidaMM: esPrimero ? String(now.getMinutes()).padStart(2, '0') : '',
      retornoHH: '',
      retornoMM: '',
      sinRetorno: false,
      motivoId: null,
      motivoLibre: null,
      motivoLibreOn: false,
      lugarOrigenId: null,
      lugarOrigenLibre: null,
      origenLibre: false,
      origenAutoLabel: '',
      lugarDestinoId: null,
      lugarDestinoLibre: null,
      destinoLibre: false,
    };
  }

  // ── Trayectos dinámicos ────────────────────────────────────────────

  agregarTrayecto(): void {
    const prev = this.trayectos[this.trayectos.length - 1];
    const nuevo = this.nuevoTrayecto(false);
    // Auto-encadenar: el origen del nuevo trayecto = destino del anterior (solo display).
    nuevo.origenAutoLabel = this.destinoLabel(prev);
    // Para el envío al backend usamos los IDs/libre del destino anterior:
    nuevo.lugarOrigenId    = prev.lugarDestinoId;
    nuevo.lugarOrigenLibre = prev.lugarDestinoLibre;
    this.trayectos.push(nuevo);
  }

  eliminarTrayecto(idx: number): void {
    if (idx === 0) return; // no se puede borrar el primero
    this.trayectos.splice(idx, 1);
    // Re-encadenar origenes posteriores
    this.recomputarOrigenes();
  }

  /** Cuando el destino de un trayecto cambia, el origen del siguiente debe actualizarse. */
  onDestinoCambio(idx: number): void {
    this.recomputarOrigenes();
  }

  private recomputarOrigenes(): void {
    for (let i = 1; i < this.trayectos.length; i++) {
      const prev = this.trayectos[i - 1];
      const curr = this.trayectos[i];
      curr.origenAutoLabel  = this.destinoLabel(prev);
      curr.lugarOrigenId    = prev.lugarDestinoId;
      curr.lugarOrigenLibre = prev.lugarDestinoLibre;
    }
  }

  private destinoLabel(t: TrayectoForm): string {
    if (t.lugarDestinoLibre) return t.lugarDestinoLibre;
    if (t.lugarDestinoId == null) return '';
    const lugar = (this.formData.lugares ?? []).find((l: any) => l.id === t.lugarDestinoId);
    return lugar?.nombreDisplay ?? '';
  }

  // ── Pickers de hora (mismo patrón que antes, ahora por trayecto) ───

  horasSalidaOptions(t: TrayectoForm): { valor: string; label: string }[] {
    // Si la fecha es hoy y es el primer trayecto, restringe a horas >= ahora.
    if (this.fechaSalida === this.todayStr && t === this.trayectos[0]) {
      const nowH = new Date().getHours();
      return this.TODAS_HORAS.filter((h) => parseInt(h) >= nowH).map((v) => ({ valor: v, label: v }));
    }
    return this.TODAS_HORAS.map((v) => ({ valor: v, label: v }));
  }

  minutosSalidaOptions(t: TrayectoForm): { valor: string; label: string }[] {
    if (this.fechaSalida === this.todayStr && t === this.trayectos[0] && t.salidaHH) {
      const now = new Date();
      if (parseInt(t.salidaHH) > now.getHours())
        return this.TODOS_MINUTOS.map((v) => ({ valor: v, label: v }));
      return this.TODOS_MINUTOS.filter((m) => parseInt(m) >= now.getMinutes()).map((v) => ({ valor: v, label: v }));
    }
    return this.TODOS_MINUTOS.map((v) => ({ valor: v, label: v }));
  }

  horasRetornoOptions(t: TrayectoForm): { valor: string; label: string }[] {
    if (!t.salidaHH) return this.TODAS_HORAS.map((v) => ({ valor: v, label: v }));
    return this.TODAS_HORAS.filter((h) => parseInt(h) >= parseInt(t.salidaHH)).map((v) => ({ valor: v, label: v }));
  }

  minutosRetornoOptions(t: TrayectoForm): { valor: string; label: string }[] {
    if (!t.retornoHH || !t.salidaHH) return this.TODOS_MINUTOS.map((v) => ({ valor: v, label: v }));
    if (parseInt(t.retornoHH) > parseInt(t.salidaHH))
      return this.TODOS_MINUTOS.map((v) => ({ valor: v, label: v }));
    const salM = parseInt(t.salidaMM || '00');
    return this.TODOS_MINUTOS.filter((m) => parseInt(m) > salM).map((v) => ({ valor: v, label: v }));
  }

  onSinRetornoChange(t: TrayectoForm, checked: boolean): void {
    t.sinRetorno = checked;
    if (checked) { t.retornoHH = ''; t.retornoMM = ''; }
  }

  onMotivoLibreChange(t: TrayectoForm, checked: boolean): void {
    t.motivoLibreOn = checked;
    t.motivoId = null;
    t.motivoLibre = null;
  }

  onOrigenLibreChange(t: TrayectoForm, checked: boolean): void {
    t.origenLibre = checked;
    t.lugarOrigenId = null;
    t.lugarOrigenLibre = null;
  }

  onDestinoLibreChange(t: TrayectoForm, checked: boolean): void {
    t.destinoLibre = checked;
    t.lugarDestinoId = null;
    t.lugarDestinoLibre = null;
    this.recomputarOrigenes();
  }

  // ── Validación + envío ─────────────────────────────────────────────

  private validarTrayecto(t: TrayectoForm, idx: number): string[] {
    const errs: string[] = [];
    const pref = `Trayecto ${idx + 1}`;
    const horaSalida = t.salidaHH && t.salidaMM ? `${t.salidaHH}:${t.salidaMM}` : '';
    const horaRetorno = !t.sinRetorno && t.retornoHH && t.retornoMM ? `${t.retornoHH}:${t.retornoMM}` : null;

    if (!horaSalida) errs.push(`${pref}: hora de salida`);
    if (!t.sinRetorno && !horaRetorno) errs.push(`${pref}: hora de retorno`);
    if (!t.motivoId && !t.motivoLibre?.trim()) errs.push(`${pref}: motivo`);
    if (!t.lugarOrigenId && !t.lugarOrigenLibre?.trim()) errs.push(`${pref}: lugar de origen`);
    if (!t.lugarDestinoId && !t.lugarDestinoLibre?.trim()) errs.push(`${pref}: lugar de destino`);
    if (t.lugarOrigenId && t.lugarDestinoId && t.lugarOrigenId === t.lugarDestinoId)
      errs.push(`${pref}: origen y destino no pueden ser iguales`);
    return errs;
  }

  save(): void {
    this.submitted = true;
    if (!this.fechaSalida) {
      Swal.fire({ title: 'Falta la fecha', icon: 'warning', confirmButtonColor: '#64BC04' });
      return;
    }

    const errors: string[] = [];
    this.trayectos.forEach((t, i) => errors.push(...this.validarTrayecto(t, i)));
    if (errors.length > 0) {
      Swal.fire({
        title: 'Campos requeridos',
        html: `<ul class="text-left text-sm list-disc pl-4">${errors.map((e) => `<li>${e}</li>`).join('')}</ul>`,
        icon: 'warning',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    const payload: SolicitudSalidaCreateDto = {
      fechaSalida: this.fechaSalida,
      trayectos: this.trayectos.map<TrayectoCreateDto>((t) => ({
        horaSalida: `${t.salidaHH}:${t.salidaMM}`,
        horaRetorno: t.sinRetorno ? null : `${t.retornoHH}:${t.retornoMM}`,
        motivoId: t.motivoId,
        motivoLibre: t.motivoLibre?.trim() || null,
        lugarOrigenId: t.lugarOrigenId,
        lugarOrigenLibre: t.lugarOrigenLibre?.trim() || null,
        lugarDestinoId: t.lugarDestinoId,
        lugarDestinoLibre: t.lugarDestinoLibre?.trim() || null,
      })),
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
