import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-photo-grid-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-grid-picker.html',
  styleUrl: './photo-grid-picker.css',
})
export class PhotoGridPicker {
  @Input() previews: string[] = [];
  @Input() max = 10;
  @Input() accept = 'image/*';
  @Input() multiple = true;
  @Input() addLabel = 'Agregar foto';
  @Input() addIcon = 'ti-camera-plus';
  @Input() color = 'var(--color-abril-standard)';

  @Output() filesSelected = new EventEmitter<FileList>();
  @Output() remove = new EventEmitter<number>();

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.filesSelected.emit(input.files);
    }
    input.value = '';
  }

  removeAt(index: number): void {
    this.remove.emit(index);
  }
}
