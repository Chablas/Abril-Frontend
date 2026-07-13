import { Component, Input, Output, EventEmitter, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-select.html',
  styleUrl: './search-select.css',
})
export class SearchSelect {
  @Input() options: any[] = [];
  @Input() valueField: string = 'id';
  @Input() displayField: string = 'name';
  @Input() value: any = null;
  @Output() valueChange = new EventEmitter<any>();
  @Input() label: string = '';
  @Input() showLabel: boolean = true;
  @Input() placeholder: string = 'Selecciona';
  @Input() allowClear: boolean = true;
  @Input() compact: boolean = false;
  /** Si es true, muestra el texto completo (sin truncar con "…") tanto en el trigger como en las opciones. */
  @Input() fullText: boolean = false;
  /**
   * Color de acento del componente (borde/anillo al enfocar y opción seleccionada).
   * Acepta cualquier valor CSS de color o variable de la paleta (ej. 'var(--color-abril-lime)').
   * Por defecto usa el teal estándar de formularios (--color-abril-standard).
   */
  @Input() color: string = 'var(--color-abril-standard)';
  /** Modo oscuro: fondo #354E6F, texto blanco. Para barras de filtros en dashboards. */
  @Input() dark: boolean = false;
  /** Si es true, el desplegable queda bloqueado: no se abre, no se limpia y no se puede cambiar. */
  @Input() disabled: boolean = false;
  /**
   * Ordena las opciones alfabéticamente por `displayField` (una sola vez, acá, para que ninguna
   * página tenga que acordarse de hacerlo). La opción "Todos/Todas" (valueField === null/undefined/'')
   * queda siempre fija primero, sin importar su texto. Poner en `false` solo cuando el orden es
   * semántico y no alfabético (ej. meses Ene→Dic, severidad Bajo→Crítico, año ascendente).
   */
  @Input() sortAlpha: boolean = true;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  isOpen = false;
  searchText = '';

  constructor(private el: ElementRef) {}

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent) {
    if (this.isOpen && !this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  /** Quita tildes/diacríticos y pasa a minúsculas para comparar (ej. "Máximo" ≈ "maximo"). */
  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  /** `options`, ordenadas alfabéticamente si corresponde (ver `sortAlpha`). */
  private get baseOptions(): any[] {
    if (!this.sortAlpha) return this.options;
    const isPlaceholder = (opt: any) => {
      const v = opt[this.valueField];
      // 0 también cuenta como "sin selección" — mismo criterio que `hasValue`, usado en
      // varias páginas como sentinel de "Todos" en campos numéricos (ej. clinicaId: 0).
      return v === null || v === undefined || v === '' || v === 0;
    };
    const pinned = this.options.filter(isPlaceholder);
    const rest = this.options
      .filter(opt => !isPlaceholder(opt))
      .slice()
      .sort((a, b) =>
        this.formatLabel(String(a[this.displayField])).localeCompare(this.formatLabel(String(b[this.displayField]))),
      );
    return [...pinned, ...rest];
  }

  get filteredOptions(): any[] {
    const base = this.baseOptions;
    if (!this.searchText.trim()) return base;
    const words = this.searchText.trim().split(/\s+/).map(w => this.normalize(w));
    return base.filter(opt => {
      const label = this.normalize(String(opt[this.displayField]));
      return words.every(w => label.includes(w));
    });
  }

  get selectedLabel(): string {
    const empty = this.value === null || this.value === undefined || this.value === 0;
    if (empty) return this.placeholder;
    const found = this.options.find(opt => opt[this.valueField] === this.value);
    return found ? this.formatLabel(String(found[this.displayField])) : this.placeholder;
  }

  /**
   * Suaviza etiquetas que llegan en MAYÚSCULA TOTAL desde la base de datos (ej. "AMANCAE") a
   * formato de nombre propio ("Amancae"), que se lee más profesional. Si el texto ya viene con
   * mayúsculas/minúsculas mixtas (ej. siglas como "TI" combinadas con palabras normales) se deja
   * intacto para no romper esos casos.
   */
  optionLabel(option: any): string {
    return this.formatLabel(String(option[this.displayField]));
  }

  private formatLabel(text: string): string {
    if (!text) return text;
    const isAllCaps = text === text.toUpperCase() && text !== text.toLowerCase();
    if (!isAllCaps) return text;
    return text.toLowerCase().replace(/(^|[\s\-/])([a-záéíóúñ])/g, (_m, sep, c) => sep + c.toUpperCase());
  }

  get hasValue(): boolean {
    return this.value !== null && this.value !== undefined && this.value !== 0;
  }

  toggle(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchText = '';
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  select(option: any) {
    this.value = option[this.valueField];
    this.valueChange.emit(this.value);
    this.notifyChange();
    this.isOpen = false;
    this.searchText = '';
  }

  clear(event: MouseEvent) {
    event.stopPropagation();
    this.value = null;
    this.valueChange.emit(null);
    this.notifyChange();
    this.searchText = '';
  }

  /**
   * Emite un evento DOM que burbujea para que contenedores como app-base-modal puedan detectar
   * que el usuario cambió este desplegable (que no produce un evento `change` nativo).
   */
  private notifyChange() {
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }

  close() {
    this.isOpen = false;
  }

  trackByOption = (_index: number, option: any): any => option[this.valueField];
}
