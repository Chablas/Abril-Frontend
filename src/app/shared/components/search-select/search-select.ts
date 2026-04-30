import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
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

  isOpen = false;
  searchText = '';

  constructor(private el: ElementRef) {}

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent) {
    if (this.isOpen && !this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  get filteredOptions(): any[] {
    if (!this.searchText.trim()) return this.options;
    const q = this.searchText.toLowerCase();
    return this.options.filter(opt =>
      String(opt[this.displayField]).toLowerCase().includes(q)
    );
  }

  get selectedLabel(): string {
    const empty = this.value === null || this.value === undefined || this.value === 0;
    if (empty) return this.placeholder;
    const found = this.options.find(opt => opt[this.valueField] === this.value);
    return found ? String(found[this.displayField]) : this.placeholder;
  }

  get hasValue(): boolean {
    return this.value !== null && this.value !== undefined && this.value !== 0;
  }

  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.searchText = '';
  }

  select(option: any) {
    this.value = option[this.valueField];
    this.valueChange.emit(this.value);
    this.isOpen = false;
    this.searchText = '';
  }

  clear(event: MouseEvent) {
    event.stopPropagation();
    this.value = null;
    this.valueChange.emit(null);
    this.searchText = '';
  }

  close() {
    this.isOpen = false;
  }
}
