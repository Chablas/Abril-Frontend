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

/** Una celda del calendario (puede pertenecer al mes vecino como relleno). */
interface DiaCelda {
  dia: number;
  mes: number; // 0-11
  anio: number;
  delMes: boolean;
}

/**
 * Selector de fecha con calendario desplegable, reemplazo estilizado del `<input type="date">`.
 * El valor se maneja como string `YYYY-MM-DD` (o null), igual que el input nativo, por lo que
 * es un reemplazo directo en los filtros/formularios existentes. La fecha también puede
 * escribirse a mano en formato `dd/mm/aaaa` (se valida al salir del campo o con Enter).
 */
@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css',
})
export class DatePicker implements OnChanges, OnDestroy {
  @Input() label: string = '';
  @Input() showLabel: boolean = true;
  @Input() placeholder: string = 'dd/mm/aaaa';
  /** Fecha seleccionada en formato `YYYY-MM-DD`, o null/undefined si no hay selección. */
  @Input() value: string | null | undefined = null;
  @Output() valueChange = new EventEmitter<string | null>();
  @Input() allowClear: boolean = true;
  /** Deshabilita el campo: no se puede escribir, ni abrir el calendario, ni limpiar. */
  @Input() disabled: boolean = false;
  /**
   * Color de acento del componente (label, borde/anillo al enfocar y día seleccionado).
   * Acepta cualquier valor CSS de color o variable de la paleta (ej. 'var(--color-abril-primary)').
   * Por defecto usa el verde lima de la marca.
   */
  @Input() color: string = 'var(--color-abril-lime)';

  readonly diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  private readonly nombresMes = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  /** Nombres cortos para la grilla del selector de mes. */
  readonly mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  /** Ancho del panel del calendario; se usa para decidir a qué lado anclarlo. */
  private readonly anchoPanel = 272;

  isOpen = false;
  /** Texto editable del input, en formato `dd/mm/aaaa`. */
  texto = '';
  /**
   * Posición del panel (`position: fixed`, calculada respecto al viewport). Usar `fixed` en vez
   * de `absolute` evita que el panel (más ancho que el campo) estire el contenedor cuando este
   * está dentro de un elemento con scroll (ej. la tabla del cronograma): con `absolute` el panel
   * formaba parte del ancho scrolleable del contenedor, ocultando días y cerrándose al tocar
   * la barra de scroll horizontal que aparecía.
   */
  panelTop = 0;
  panelLeft = 0;

  /** Handler de scroll (capturing) usado para cerrar el panel si algún ancestro hace scroll. */
  private readonly onAncestorScroll = () => this.close();

  /** Mes (0-11) y año visibles en el calendario. */
  vistaMes = 0;
  vistaAnio = 0;
  semanas: DiaCelda[][] = [];

  /** Vista activa del panel: grilla de días, selector de mes o selector de año. */
  vista: 'dias' | 'meses' | 'anios' = 'dias';
  /** Primer año del bloque de 12 visible en el selector de año. */
  anioBase = 0;

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) this.texto = this.formatoLegible(this.value);
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

  get hasValue(): boolean {
    return !!this.parse(this.value);
  }

  get nombreMesVista(): string {
    return this.nombresMes[this.vistaMes];
  }

  /** Años del bloque visible en el selector de año. */
  get aniosGrid(): number[] {
    return Array.from({ length: 12 }, (_, i) => this.anioBase + i);
  }

  get etiquetaRangoAnios(): string {
    return `${this.anioBase} – ${this.anioBase + 11}`;
  }

  abrir() {
    if (this.disabled || this.isOpen) return;
    this.isOpen = true;
    this.vista = 'dias';
    this.posicionarPanel();
    if (typeof document !== 'undefined') {
      // Captura: los contenedores internos con scroll (ej. la tabla del cronograma) no
      // burbujean su evento 'scroll', por lo que hay que escucharlo en fase de captura.
      document.addEventListener('scroll', this.onAncestorScroll, true);
      window.addEventListener('resize', this.onAncestorScroll);
    }
    this.initVista();
  }

  toggleCalendario(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;
    if (this.isOpen) this.close();
    else this.abrir();
  }

  close() {
    this.isOpen = false;
    this.vista = 'dias';
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

  /** Alterna entre la grilla de días y el selector de mes (click en el mes de la cabecera). */
  toggleVistaMeses() {
    this.vista = this.vista === 'meses' ? 'dias' : 'meses';
  }

  /** Alterna entre la vista actual y el selector de año (click en el año de la cabecera). */
  toggleVistaAnios() {
    if (this.vista === 'anios') {
      this.vista = 'dias';
      return;
    }
    this.anioBase = this.vistaAnio - (this.vistaAnio % 12);
    this.vista = 'anios';
  }

  seleccionarMes(mes: number) {
    this.vistaMes = mes;
    this.vista = 'dias';
    this.construirGrid();
  }

  seleccionarAnio(anio: number) {
    this.vistaAnio = anio;
    this.vista = 'dias';
    this.construirGrid();
  }

  /** Navegación izquierda de la cabecera según la vista activa. */
  navPrev() {
    if (this.vista === 'dias') this.mesAnterior();
    else if (this.vista === 'meses') this.vistaAnio--;
    else this.anioBase -= 12;
  }

  /** Navegación derecha de la cabecera según la vista activa. */
  navNext() {
    if (this.vista === 'dias') this.mesSiguiente();
    else if (this.vista === 'meses') this.vistaAnio++;
    else this.anioBase += 12;
  }

  esMesActual(mes: number): boolean {
    const t = new Date();
    return t.getFullYear() === this.vistaAnio && t.getMonth() === mes;
  }

  esAnioActual(anio: number): boolean {
    return new Date().getFullYear() === anio;
  }

  /**
   * Autoformatea lo escrito insertando las `/` de `dd/mm/aaaa` a medida que se teclea
   * (ej. `12` → `12/`, `1204` → `12/04/`). Al borrar no se re-insertan las barras para
   * no pelear con el usuario. Solo se conservan dígitos (máx. 8).
   */
  onTextoChange(valor: string) {
    const borrando = valor.length < this.texto.length;
    const digitos = valor.replace(/\D/g, '').slice(0, 8);

    let out: string;
    if (digitos.length > 4) out = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
    else if (digitos.length === 4) out = borrando ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : `${digitos.slice(0, 2)}/${digitos.slice(2)}/`;
    else if (digitos.length === 3) out = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
    else if (digitos.length === 2) out = borrando ? digitos : `${digitos}/`;
    else out = digitos;

    this.texto = out;
  }

  /**
   * Valida lo escrito a mano (al salir del campo o con Enter): acepta `dd/mm/aaaa`
   * (también con `-` o `.`), emite si es una fecha real y revierte el texto si no lo es.
   * El año también puede escribirse con 2 dígitos (ej. `26`): se autocompleta a `20xx`.
   */
  confirmarTexto() {
    const t = this.texto.trim();

    if (!t) {
      if (this.hasValue) this.emitir(null);
      else this.texto = '';
      return;
    }

    const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/.exec(t);
    if (m) {
      const dia = +m[1];
      const mes = +m[2] - 1;
      const anio = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      const diasEnMes = new Date(anio, mes + 1, 0).getDate();
      if (mes >= 0 && mes <= 11 && dia >= 1 && dia <= diasEnMes) {
        const nuevo = this.format(anio, mes, dia);
        if (nuevo !== this.value) this.emitir(nuevo);
        else this.texto = this.formatoLegible(this.value);
        return;
      }
    }

    // Texto inválido: se revierte a la última fecha válida (o vacío).
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

  hoy() {
    const t = new Date();
    this.emitir(this.format(t.getFullYear(), t.getMonth(), t.getDate()));
    this.close();
  }

  seleccionar(celda: DiaCelda) {
    this.emitir(this.format(celda.anio, celda.mes, celda.dia));
    this.close();
  }

  esSeleccionado(celda: DiaCelda): boolean {
    const p = this.parse(this.value);
    return !!p && p.anio === celda.anio && p.mes === celda.mes && p.dia === celda.dia;
  }

  esHoy(celda: DiaCelda): boolean {
    const t = new Date();
    return t.getFullYear() === celda.anio && t.getMonth() === celda.mes && t.getDate() === celda.dia;
  }

  mesAnterior() {
    if (this.vistaMes === 0) { this.vistaMes = 11; this.vistaAnio--; }
    else this.vistaMes--;
    this.construirGrid();
  }

  mesSiguiente() {
    if (this.vistaMes === 11) { this.vistaMes = 0; this.vistaAnio++; }
    else this.vistaMes++;
    this.construirGrid();
  }

  anioAnterior() {
    this.vistaAnio--;
    this.construirGrid();
  }

  anioSiguiente() {
    this.vistaAnio++;
    this.construirGrid();
  }

  // ── Internos ─────────────────────────────────────────────────────────

  private emitir(valor: string | null) {
    this.value = valor;
    this.texto = this.formatoLegible(valor);
    this.valueChange.emit(valor);
    // Evento DOM que burbujea para contenedores como app-base-modal (igual que search-select).
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }

  /** Posiciona la vista en la fecha seleccionada o, si no hay, en el mes actual. */
  private initVista() {
    const p = this.parse(this.value);
    const base = p ?? { anio: new Date().getFullYear(), mes: new Date().getMonth(), dia: 1 };
    this.vistaAnio = base.anio;
    this.vistaMes = base.mes;
    this.construirGrid();
  }

  /** Desglosa el mes visible en semanas lunes-a-domingo, con relleno de los meses vecinos. */
  private construirGrid() {
    const anio = this.vistaAnio;
    const mes = this.vistaMes;
    const primerDia = new Date(anio, mes, 1);
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const diasMesPrevio = new Date(anio, mes, 0).getDate();

    // getDay(): 0=domingo..6=sábado → lo paso a 0=lunes..6=domingo.
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const prev = mes === 0 ? { mes: 11, anio: anio - 1 } : { mes: mes - 1, anio };
    const next = mes === 11 ? { mes: 0, anio: anio + 1 } : { mes: mes + 1, anio };

    const celdas: DiaCelda[] = [];

    for (let i = offsetInicio - 1; i >= 0; i--) {
      celdas.push({ dia: diasMesPrevio - i, mes: prev.mes, anio: prev.anio, delMes: false });
    }
    for (let d = 1; d <= diasEnMes; d++) {
      celdas.push({ dia: d, mes, anio, delMes: true });
    }
    let diaSiguiente = 1;
    while (celdas.length % 7 !== 0) {
      celdas.push({ dia: diaSiguiente++, mes: next.mes, anio: next.anio, delMes: false });
    }

    this.semanas = [];
    for (let i = 0; i < celdas.length; i += 7) {
      this.semanas.push(celdas.slice(i, i + 7));
    }
  }

  private format(anio: number, mes: number, dia: number): string {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  /** `YYYY-MM-DD` → `dd/mm/aaaa` para mostrar en el input (o '' si no hay valor). */
  private formatoLegible(v: string | null | undefined): string {
    const p = this.parse(v);
    if (!p) return '';
    return `${String(p.dia).padStart(2, '0')}/${String(p.mes + 1).padStart(2, '0')}/${p.anio}`;
  }

  private parse(v: string | null | undefined): { anio: number; mes: number; dia: number } | null {
    if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (!m) return null;
    return { anio: +m[1], mes: +m[2] - 1, dia: +m[3] };
  }
}
