import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Selector de hora con desplegable estilizado, reemplazo del `<input type="time">` nativo
 * (que es feo y no respeta la paleta de la marca). El valor se maneja como string `HH:mm`
 * en formato de 24 horas (o null), igual que el input nativo, por lo que es un reemplazo
 * directo en formularios/filtros existentes. La hora también puede escribirse a mano en
 * formato `HH:mm` (se valida al salir del campo o con Enter).
 *
 * El color de acento (label, borde/anillo al enfocar y opción seleccionada) es configurable
 * vía `color`; por defecto usa el teal estándar de la app (`--color-abril-standard`).
 */
@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './time-picker.html',
  styleUrl: './time-picker.css',
})
export class TimePicker implements OnChanges, OnDestroy {
  @Input() label = '';
  @Input() showLabel = true;
  @Input() placeholder = '--:--';
  /** Hora seleccionada en formato `HH:mm` (24h), o null/undefined si no hay selección. */
  @Input() value: string | null | undefined = null;
  @Output() valueChange = new EventEmitter<string | null>();
  @Input() allowClear = true;
  /** Deshabilita el campo: no se puede escribir, ni abrir el desplegable, ni limpiar. */
  @Input() disabled = false;
  /**
   * Color de acento del componente (label, borde/anillo al enfocar y opción seleccionada).
   * Acepta cualquier valor CSS de color o variable de la paleta
   * (ej. 'var(--color-abril-logo-blue)'). Por defecto usa el teal estándar de la app.
   */
  @Input() color = 'var(--color-abril-standard)';
  /** Paso en minutos de la columna de minutos (1 = todos los minutos, 5 = 00,05,10...). */
  @Input() minuteStep = 1;

  /** Ancho del panel; se usa para decidir a qué lado anclarlo respecto del viewport. */
  private readonly anchoPanel = 176;

  isOpen = false;
  /** Texto editable del input, en formato `HH:mm`. */
  texto = '';
  /** Posición del panel (`position: fixed`, respecto al viewport) — mismo motivo que en date-picker. */
  panelTop = 0;
  panelLeft = 0;

  readonly horas: string[] = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  minutos: string[] = [];

  /**
   * Handler de scroll (capturing) usado para cerrar el panel si algún ancestro hace scroll.
   * Los scrolls que se originan dentro del propio componente (las columnas de hora/minuto
   * son scrolleables) no deben cerrarlo — solo los de ancestros reales.
   */
  private readonly onAncestorScroll = (event?: Event) => {
    if (event?.target instanceof Node && this.el.nativeElement.contains(event.target)) return;
    this.close();
  };

  constructor(private el: ElementRef) {
    this.recalcMinutos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) this.texto = this.formatoLegible(this.value);
    if (changes['minuteStep']) this.recalcMinutos();
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('scroll', this.onAncestorScroll, true);
      window.removeEventListener('resize', this.onAncestorScroll);
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent) {
    if (this.isOpen && !this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  private recalcMinutos(): void {
    const step = this.minuteStep >= 1 ? Math.floor(this.minuteStep) : 1;
    const out: string[] = [];
    for (let m = 0; m < 60; m += step) out.push(String(m).padStart(2, '0'));
    this.minutos = out;
  }

  get hasValue(): boolean {
    return !!this.parse(this.value);
  }

  /** Hora (`HH`) seleccionada actualmente, o null. */
  get selHora(): string | null {
    return this.parse(this.value)?.h ?? null;
  }

  /** Minuto (`mm`) seleccionado actualmente, o null. */
  get selMinuto(): string | null {
    return this.parse(this.value)?.m ?? null;
  }

  abrir() {
    if (this.disabled || this.isOpen) return;
    this.isOpen = true;
    this.posicionarPanel();
    if (typeof document !== 'undefined') {
      document.addEventListener('scroll', this.onAncestorScroll, true);
      window.addEventListener('resize', this.onAncestorScroll);
    }
    // Deja que el panel se pinte antes de centrar las opciones seleccionadas.
    setTimeout(() => this.scrollSeleccionadoAlCentro());
  }

  togglePanel(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;
    if (this.isOpen) this.close();
    else this.abrir();
  }

  close() {
    this.isOpen = false;
    if (typeof document !== 'undefined') {
      document.removeEventListener('scroll', this.onAncestorScroll, true);
      window.removeEventListener('resize', this.onAncestorScroll);
    }
  }

  /** Calcula la posición del panel (`fixed`), pegado al campo y ajustado para no salirse del viewport. */
  private posicionarPanel() {
    if (typeof window === 'undefined') return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    const margen = 12;
    const left = Math.min(rect.left, window.innerWidth - this.anchoPanel - margen);
    this.panelLeft = Math.max(left, margen);
    this.panelTop = rect.bottom + 4;
  }

  /**
   * Centra la opción seleccionada scrolleando solo su columna (`scrollTop` directo).
   * No usar `scrollIntoView`: también scrollea contenedores ancestros de la página,
   * y ese scroll externo cerraría el panel vía `onAncestorScroll`.
   */
  private scrollSeleccionadoAlCentro() {
    if (typeof document === 'undefined') return;
    const seleccionados = this.el.nativeElement.querySelectorAll('.tp-opt.tp-selected');
    seleccionados.forEach((btn: Element) => {
      const col = btn.parentElement;
      if (!col) return;
      const opt = btn as HTMLElement;
      // offsetTop se mide contra el panel (offsetParent), no contra la columna (static).
      col.scrollTop = opt.offsetTop - col.offsetTop - (col.clientHeight - opt.offsetHeight) / 2;
    });
  }

  seleccionarHora(h: string) {
    const m = this.selMinuto ?? '00';
    this.emitir(`${h}:${m}`);
    // Mantener abierto para que el usuario elija/ajuste los minutos a continuación.
  }

  seleccionarMinuto(m: string) {
    const h = this.selHora ?? '00';
    this.emitir(`${h}:${m}`);
    // Elegir el minuto confirma la hora completa; se cierra el panel.
    this.close();
  }

  esHoraActual(h: string): boolean {
    return this.horaActual().h === h;
  }

  esMinutoActual(m: string): boolean {
    return this.horaActual().m === m;
  }

  /**
   * Autoformatea lo escrito insertando `:` de `HH:mm` a medida que se teclea
   * (ej. `13` → `13:`, `1345` → `13:45`). Al borrar no se re-inserta el `:`.
   * Solo se conservan dígitos (máx. 4).
   */
  onTextoChange(valor: string) {
    const borrando = valor.length < this.texto.length;
    const digitos = valor.replace(/\D/g, '').slice(0, 4);

    let out: string;
    if (digitos.length > 2) out = `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
    else if (digitos.length === 2) out = borrando ? digitos : `${digitos}:`;
    else out = digitos;

    this.texto = out;
  }

  /**
   * Valida lo escrito a mano (al salir del campo o con Enter): acepta `H:mm`/`HH:mm`
   * (también `HHmm`), emite si es una hora real (00–23 : 00–59) y revierte el texto si no lo es.
   */
  confirmarTexto() {
    const t = this.texto.trim();

    if (!t) {
      if (this.hasValue) this.emitir(null);
      else this.texto = '';
      return;
    }

    const m = /^(\d{1,2})[:.]?(\d{2})$/.exec(t);
    if (m) {
      const hora = +m[1];
      const min = +m[2];
      if (hora >= 0 && hora <= 23 && min >= 0 && min <= 59) {
        const nuevo = `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        if (nuevo !== this.value) this.emitir(nuevo);
        else this.texto = this.formatoLegible(this.value);
        return;
      }
    }

    // Texto inválido: se revierte a la última hora válida (o vacío).
    this.texto = this.formatoLegible(this.value);
  }

  onEnter() {
    this.confirmarTexto();
    this.close();
  }

  clear(event: MouseEvent) {
    event.stopPropagation();
    this.emitir(null);
  }

  ahora() {
    const t = this.horaActual();
    this.emitir(`${t.h}:${t.m}`);
    this.close();
  }

  // ── Internos ─────────────────────────────────────────────────────────

  private emitir(valor: string | null) {
    this.value = valor;
    this.texto = this.formatoLegible(valor);
    this.valueChange.emit(valor);
    // Evento DOM que burbujea para contenedores como app-base-modal (igual que search-select/date-picker).
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }

  private horaActual(): { h: string; m: string } {
    const d = new Date();
    return {
      h: String(d.getHours()).padStart(2, '0'),
      m: String(d.getMinutes()).padStart(2, '0'),
    };
  }

  /** `HH:mm` normalizado para mostrar en el input (o '' si no hay valor). */
  private formatoLegible(v: string | null | undefined): string {
    const p = this.parse(v);
    return p ? `${p.h}:${p.m}` : '';
  }

  private parse(v: string | null | undefined): { h: string; m: string } | null {
    if (!v) return null;
    const m = /^(\d{1,2}):(\d{2})/.exec(v);
    if (!m) return null;
    const hora = +m[1];
    const min = +m[2];
    if (hora < 0 || hora > 23 || min < 0 || min > 59) return null;
    return { h: String(hora).padStart(2, '0'), m: String(min).padStart(2, '0') };
  }
}
