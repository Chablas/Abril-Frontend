import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
import { TimePicker } from '../../../../../../shared/components/time-picker/time-picker';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { SolicitudSalidasService } from '../../services/solicitud-salidas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SolicitudSalidaFormDataDto } from '../../dtos/solicitud-salida-form-data.dto';
import { SolicitudSalidaCreateDto, TrayectoCreateDto } from '../../dtos/solicitud-salida-create.dto';

/** Estado en memoria de un trayecto en el form. Horas en formato nativo "HH:mm". */
interface TrayectoForm {
  horaSalida: string;
  horaRetorno: string;
  sinRetorno: boolean;
  motivoId: number | null;
  motivoLibre: string | null;
  motivoLibreOn: boolean;
  /** Detalle obligatorio cuando el motivo elegido tiene requiereMotivoAdicional. */
  motivoAdicional: string | null;
  /** Origen solo es editable en el primer trayecto. */
  lugarOrigenId: number | null;
  lugarOrigenLibre: string | null;
  origenLibre: boolean;
  /** Texto display del origen autocalculado en trayectos posteriores (solo lectura). */
  origenAutoLabel: string;
  lugarDestinoId: number | null;
  lugarDestinoLibre: string | null;
  destinoLibre: boolean;
  /** Documentos adjuntos (prueba) — al menos uno obligatorio cuando el motivo elegido lo requiere. */
  adjuntos: SelectedFile[];
}

@Component({
  standalone: true,
  selector: 'app-solicitud-salida-create',
  imports: [BaseModal, CommonModule, FormsModule, SearchSelect, DatePicker, TimePicker, FileSelector],
  templateUrl: './create.html',
  styleUrl: './create.css',
})
export class SolicitudSalidaCreate implements OnInit {
  @Input() fullScreen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  /**
   * Máximo de caracteres del motivo personalizado. El motivo se imprime en la
   * columna MOTIVO del PDF (≈200pt a 8.5pt), donde ~90 caracteres llenan 2 líneas.
   * Mantener alineado con el recorte a 2 líneas del PDF (TablaMaxLineas).
   */
  readonly MOTIVO_LIBRE_MAX = 90;

  /**
   * Máximo de caracteres del motivo adicional. Este detalle no reemplaza al motivo:
   * en el PDF y en los correos va pegado a él ("Visita a obra — ..."), así que se deja
   * menos margen que en MOTIVO_LIBRE_MAX para que la suma siga entrando en las 2 líneas
   * de la columna MOTIVO de la planilla.
   */
  readonly MOTIVO_ADICIONAL_MAX = 60;

  formData: SolicitudSalidaFormDataDto = {
    motivos: [],
    lugares: [],
    aprobadorEmail: null,
    esTI: false,
    trayectosCatalogo: [],
    trayectosNoReembolsables: [],
  };

  fechaSalida = '';
  trayectos: TrayectoForm[] = [];

  submitted = false;

  constructor(
    private service: SolicitudSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
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

  /** Hora actual en formato "HH:mm" (comparable con los valores de app-time-picker). */
  private get nowStr(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private nuevoTrayecto(esPrimero: boolean): TrayectoForm {
    const now = new Date();
    return {
      horaSalida: esPrimero ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '',
      horaRetorno: '',
      sinRetorno: false,
      motivoId: null,
      motivoLibre: null,
      motivoLibreOn: false,
      motivoAdicional: null,
      lugarOrigenId: null,
      lugarOrigenLibre: null,
      origenLibre: false,
      origenAutoLabel: '',
      lugarDestinoId: null,
      lugarDestinoLibre: null,
      destinoLibre: false,
      adjuntos: [],
    };
  }

  // ── Trayectos dinámicos ────────────────────────────────────────────

  agregarTrayecto(): void {
    if (!this.puedeAgregarTrayecto) return;
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

  destinoLabel(t: TrayectoForm): string {
    if (t.lugarDestinoLibre) return t.lugarDestinoLibre;
    if (t.lugarDestinoId == null) return '';
    const lugar = (this.formData.lugares ?? []).find((l: any) => l.id === t.lugarDestinoId);
    return lugar?.nombreDisplay ?? '';
  }

  /**
   * Devuelve el monto del catálogo `ga_trayecto` para el trayecto si existe match.
   * Solo aplica para trabajadores TI; null en cualquier otro caso.
   */
  montoCatalogoTrayecto(t: TrayectoForm): number | null {
    if (!this.formData.esTI) return null;
    if (t.lugarOrigenId == null || t.lugarDestinoId == null) return null;
    const match = this.formData.trayectosCatalogo.find(
      (c) => c.lugarOrigenId === t.lugarOrigenId && c.lugarDestinoId === t.lugarDestinoId,
    );
    return match ? match.monto : null;
  }

  // ── Reembolso de movilidad ─────────────────────────────────────────
  // La regla es asimétrica y se decide entre dos configuraciones (Gestión
  // Administrativa → Configuración): el MOTIVO concede el reembolso y el
  // TRAYECTO puede quitárselo, nunca al revés. Por eso un par (origen, destino)
  // marcado como no reembolsable (hoy Oficina Central ↔ Bosque Real, que la
  // empresa cubre con movilidad propia) gana sobre el motivo.
  // Acá solo se informa: el trabajador no elige si su salida es reembolsable.

  /** Etiqueta del lugar de origen del trayecto (texto libre, o nombre del catálogo). */
  origenLabel(t: TrayectoForm): string {
    if (t.lugarOrigenLibre) return t.lugarOrigenLibre;
    if (t.lugarOrigenId == null) return '';
    return (this.formData.lugares ?? []).find((l) => l.id === t.lugarOrigenId)?.nombreDisplay ?? '';
  }

  /** Motivo del trayecto tal cual se guardará: el del catálogo, o el de "Otro motivo". */
  motivoLabel(t: TrayectoForm): string {
    if (t.motivoLibreOn) return t.motivoLibre?.trim() || 'Otro motivo';
    if (t.motivoId == null) return '';
    return this.formData.motivos.find((m) => m.id === t.motivoId)?.descripcion ?? '';
  }

  /** "Origen → Destino", o cadena vacía mientras falte alguno de los dos. */
  rutaLabel(t: TrayectoForm): string {
    const origen = this.origenLabel(t);
    const destino = this.destinoLabel(t);
    return origen && destino ? `${origen} → ${destino}` : '';
  }

  /**
   * true si el motivo elegido concede reembolso. "Otro motivo" nunca lo concede:
   * un motivo fuera del catálogo no tiene configuración que consultar.
   */
  motivoEsReembolsable(t: TrayectoForm): boolean {
    if (t.motivoId == null) return false;
    return this.formData.motivos.find((m) => m.id === t.motivoId)?.esReembolsable ?? false;
  }

  /** true si el par (origen, destino) elegido está marcado como no reembolsable. */
  trayectoExcluido(t: TrayectoForm): boolean {
    if (t.lugarOrigenId == null || t.lugarDestinoId == null) return false;
    return (this.formData.trayectosNoReembolsables ?? []).some(
      (p) => p.lugarOrigenId === t.lugarOrigenId && p.lugarDestinoId === t.lugarDestinoId,
    );
  }

  /** true si el trayecto genera reembolso: lo concede el motivo y el trayecto no lo anula. */
  trayectoCorrespondeReembolso(t: TrayectoForm): boolean {
    return this.motivoEsReembolsable(t) && !this.trayectoExcluido(t);
  }

  /**
   * El aviso de reembolso solo aparece cuando algún trayecto eligió un motivo que lo
   * concede: para el resto de salidas no hay nada que informar.
   */
  get mostrarReembolso(): boolean {
    return this.trayectos.some((t) => this.motivoEsReembolsable(t));
  }

  /** true si al menos un trayecto termina generando reembolso. */
  get correspondeReembolso(): boolean {
    return this.trayectos.some((t) => this.trayectoCorrespondeReembolso(t));
  }

  /** Motivo por el que un trayecto no genera reembolso; vacío si sí lo genera. */
  razonSinReembolso(t: TrayectoForm): string {
    if (this.trayectoCorrespondeReembolso(t)) return '';
    if (this.trayectoExcluido(t)) return 'trayecto no reembolsable';
    return 'motivo no reembolsable';
  }

  // ── Manejo de horas ────────────────────────────────────────────────

  onSinRetornoChange(t: TrayectoForm, checked: boolean): void {
    t.sinRetorno = checked;
    if (checked) { t.horaRetorno = ''; }
  }

  onMotivoLibreChange(t: TrayectoForm, checked: boolean): void {
    t.motivoLibreOn = checked;
    t.motivoId = null;
    t.motivoLibre = null;
    t.motivoAdicional = null;
    t.adjuntos = [];
    // "Otro motivo" siempre pide horario: si venía de un motivo que no lo pedía, el primer
    // trayecto recupera su hora de salida por defecto.
    if (!t.horaSalida && t === this.trayectos[0]) t.horaSalida = this.nowStr;
  }

  // ── Documento adjunto por motivo ───────────────────────────────────

  /** true si el motivo elegido del trayecto exige documento adjunto. */
  motivoRequiereAdjunto(t: TrayectoForm): boolean {
    if (t.motivoId == null) return false;
    return this.formData.motivos.find((m) => m.id === t.motivoId)?.requiereAdjunto ?? false;
  }

  /**
   * true si el motivo elegido del trayecto exige escribir un motivo adicional.
   * Solo aplica a los motivos del catálogo: "Otro motivo" ya es texto libre.
   */
  motivoRequiereMotivoAdicional(t: TrayectoForm): boolean {
    if (t.motivoId == null) return false;
    return this.formData.motivos.find((m) => m.id === t.motivoId)?.requiereMotivoAdicional ?? false;
  }

  /**
   * true si el trayecto ya tiene un motivo definido (del catálogo o la vía "Otro motivo").
   * Las horas se habilitan recién cuando hay motivo — su etiqueta depende de él.
   */
  motivoElegido(t: TrayectoForm): boolean {
    return t.motivoId != null || t.motivoLibreOn;
  }

  /** true si el motivo elegido es de hora estimada. Motivo libre cuenta como hora exacta. */
  motivoEsHoraEstimada(t: TrayectoForm): boolean {
    if (t.motivoId == null) return false;
    return this.formData.motivos.find((m) => m.id === t.motivoId)?.esHoraEstimada ?? false;
  }

  /**
   * El recordatorio de recuperación de horas solo aplica a motivos del catálogo de
   * hora exacta: aparece cuando al menos un trayecto tiene un motivo del catálogo que
   * NO es de hora estimada. El motivo libre (personalizado) queda excluido a propósito
   * y nunca dispara el recordatorio. El backend replica la regla para omitirlo en los correos.
   */
  get mostrarRecordatorioRecuperacion(): boolean {
    return this.trayectos.some(
      (t) => t.motivoId != null && !this.motivoEsHoraEstimada(t) && this.motivoPideHorasLugares(t),
    );
  }

  /** Etiqueta de la hora de retorno según el motivo: estimada / exacta (neutra sin motivo aún). */
  labelHoraRetorno(t: TrayectoForm): string {
    if (!this.motivoElegido(t)) return 'Hora de retorno';
    return this.motivoEsHoraEstimada(t) ? 'Hora de retorno estimada' : 'Hora de retorno exacta';
  }

  async onMotivoChange(t: TrayectoForm, motivoId: number | null): Promise<void> {
    const anterior = t.motivoId;
    t.motivoId = motivoId;
    // Los adjuntos y el motivo adicional pertenecen al motivo elegido: al cambiarlo se descartan.
    t.adjuntos = [];
    t.motivoAdicional = null;

    if (this.motivoPideHorasLugares(t)) {
      // Al volver a un motivo normal, el primer trayecto recupera la hora de salida por
      // defecto que se le había limpiado.
      if (!t.horaSalida && t === this.trayectos[0]) t.horaSalida = this.nowStr;
      return;
    }

    // El motivo no admite varios trayectos: se descartan los demás, previa confirmación
    // para no borrar en silencio lo que el trabajador ya había escrito.
    if (this.trayectos.length > 1) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Este motivo no admite varios trayectos',
        text: 'Se quitarán los demás trayectos de la solicitud.',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Elegir otro motivo',
        confirmButtonColor: '#0086A5',
      });
      if (!result.isConfirmed) {
        t.motivoId = anterior;
        this.cdr.detectChanges();
        return;
      }
      this.trayectos = [t];
    }

    this.limpiarHorasYLugares(t);
    this.cdr.detectChanges();
  }

  /** Descarta horario y lugares del trayecto: su motivo no los pide. */
  private limpiarHorasYLugares(t: TrayectoForm): void {
    t.horaSalida = '';
    t.horaRetorno = '';
    t.sinRetorno = false;
    t.lugarOrigenId = null;
    t.lugarOrigenLibre = null;
    t.origenLibre = false;
    t.origenAutoLabel = '';
    t.lugarDestinoId = null;
    t.lugarDestinoLibre = null;
    t.destinoLibre = false;
  }

  /**
   * true si el motivo elegido pide horas, lugares y trayectos — lo normal. Los motivos con
   * pideHorasLugares = false describen una ausencia de día completo (ej. licencia sin goce de
   * haber): no llevan horario ni lugares y la solicitud queda con un solo trayecto. Sin motivo
   * elegido, y con "Otro motivo", se pide todo.
   */
  motivoPideHorasLugares(t: TrayectoForm): boolean {
    if (t.motivoId == null) return true;
    return this.formData.motivos.find((m) => m.id === t.motivoId)?.pideHorasLugares ?? true;
  }

  /** Los motivos que no piden horario tampoco admiten trayectos adicionales. */
  get puedeAgregarTrayecto(): boolean {
    return this.trayectos.every((t) => this.motivoPideHorasLugares(t));
  }

  /** El file-selector emite un evento por archivo; los acumulamos en el trayecto. */
  onAdjuntoSelected(t: TrayectoForm, file: SelectedFile): void {
    t.adjuntos.push(file);
  }

  quitarAdjunto(t: TrayectoForm, index: number): void {
    t.adjuntos.splice(index, 1);
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

  // ── Obligatoriedad de motivo y lugares ─────────────────────────────
  // La regla es la misma para las dos vías de captura: el desplegable del
  // catálogo y el texto libre de "Otro motivo" / "Otro lugar". Estos helpers son
  // el único origen de verdad — los usa el template (borde rojo y "Campo
  // requerido") y validarTrayecto antes de enviar, así ninguna de las dos vías
  // puede quedar opcional por descuido.

  /** true si el trayecto tiene motivo: opción del desplegable, o texto libre no vacío. */
  motivoValido(t: TrayectoForm): boolean {
    return t.motivoLibreOn ? !!t.motivoLibre?.trim() : t.motivoId != null;
  }

  /** true si el motivo adicional está resuelto: o el motivo no lo pide, o está escrito. */
  motivoAdicionalValido(t: TrayectoForm): boolean {
    return this.motivoRequiereMotivoAdicional(t) ? !!t.motivoAdicional?.trim() : true;
  }

  /**
   * true si el trayecto tiene lugar de origen. En los trayectos 2+ el origen no se
   * edita: viene encadenado del destino del trayecto anterior, así que se valida
   * contra lo que quedó copiado (id o texto libre).
   */
  origenValido(t: TrayectoForm, idx: number): boolean {
    if (idx > 0) return t.lugarOrigenId != null || !!t.lugarOrigenLibre?.trim();
    return t.origenLibre ? !!t.lugarOrigenLibre?.trim() : t.lugarOrigenId != null;
  }

  /** true si el trayecto tiene lugar de destino: desplegable, o texto libre no vacío. */
  destinoValido(t: TrayectoForm): boolean {
    return t.destinoLibre ? !!t.lugarDestinoLibre?.trim() : t.lugarDestinoId != null;
  }

  // ── Validación + envío ─────────────────────────────────────────────

  private validarTrayecto(t: TrayectoForm, idx: number): string[] {
    const errs: string[] = [];
    const pref = `Trayecto ${idx + 1}`;

    if (!this.motivoValido(t)) errs.push(`${pref}: motivo`);
    if (!this.motivoAdicionalValido(t)) errs.push(`${pref}: motivo adicional`);
    if (this.motivoRequiereAdjunto(t) && t.adjuntos.length === 0)
      errs.push(`${pref}: el motivo seleccionado requiere al menos un documento adjunto`);

    // Un motivo que no pide horario ni lugares no tiene nada más que validar.
    if (!this.motivoPideHorasLugares(t)) return errs;

    if (!t.horaSalida) errs.push(`${pref}: hora de salida`);
    if (!t.sinRetorno && !t.horaRetorno) errs.push(`${pref}: hora de retorno`);
    // La salida no puede ser de un tiempo pasado: la fecha debe ser hoy o futura
    // (ver save()) y, cuando la salida es HOY, la hora de salida debe ser igual o
    // posterior a la hora actual. Para fechas futuras se acepta cualquier hora.
    if (this.fechaSalida === this.todayStr) {
      const ahora = this.nowStr;
      if (t.horaSalida && t.horaSalida < ahora)
        errs.push(`${pref}: la hora de salida no puede ser anterior a la hora actual (${ahora})`);
    }
    if (!t.sinRetorno && t.horaRetorno && t.horaSalida && t.horaRetorno < t.horaSalida)
      errs.push(`${pref}: la hora de retorno debe ser igual o posterior a la de salida`);
    if (!this.origenValido(t, idx)) errs.push(`${pref}: lugar de origen`);
    if (!this.destinoValido(t)) errs.push(`${pref}: lugar de destino`);
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
    // Solo validación de frontend: la fecha de salida no puede ser anterior a hoy.
    if (this.fechaSalida < this.todayStr) {
      Swal.fire({
        title: 'Fecha inválida',
        text: 'La fecha de salida no puede ser anterior a hoy.',
        icon: 'warning',
        confirmButtonColor: '#64BC04',
      });
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
      trayectos: this.trayectos.map<TrayectoCreateDto>((t) => {
        const pide = this.motivoPideHorasLugares(t);
        return {
          horaSalida: pide ? t.horaSalida : null,
          horaRetorno: pide && !t.sinRetorno ? t.horaRetorno : null,
          motivoId: t.motivoId,
          motivoLibre: t.motivoLibre?.trim() || null,
          motivoAdicional: t.motivoAdicional?.trim() || null,
          lugarOrigenId: pide ? t.lugarOrigenId : null,
          lugarOrigenLibre: pide ? t.lugarOrigenLibre?.trim() || null : null,
          lugarDestinoId: pide ? t.lugarDestinoId : null,
          lugarDestinoLibre: pide ? t.lugarDestinoLibre?.trim() || null : null,
        };
      }),
    };

    // Documentos adjuntos por índice de trayecto (N por trayecto). Se aplana:
    // cada archivo repite el índice de su trayecto.
    const adjuntos = this.trayectos.flatMap((t, i) =>
      t.adjuntos.map((a) => ({ trayectoIndex: i, file: a.file })),
    );

    this.loaderService.show();
    this.service.create(payload, adjuntos).subscribe({
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
