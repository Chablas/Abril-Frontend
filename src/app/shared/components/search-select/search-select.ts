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
   * Color de acento del componente (label, borde/anillo al enfocar y opción seleccionada).
   * Acepta cualquier valor CSS de color o variable de la paleta (ej. 'var(--color-abril-lime)').
   * Por defecto usa el verde primario de la marca.
   */
  @Input() color: string = 'var(--color-abril-primary)';
  /** Modo oscuro: fondo #354E6F, texto blanco. Para barras de filtros en dashboards. */
  @Input() dark: boolean = false;
  /** Si es true, el desplegable queda bloqueado: no se abre, no se limpia y no se puede cambiar. */
  @Input() disabled: boolean = false;

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

  get filteredOptions(): any[] {
    if (!this.searchText.trim()) return this.options;
    const words = this.searchText.trim().split(/\s+/).map(w => this.normalize(w));
    return this.options.filter(opt => {
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
