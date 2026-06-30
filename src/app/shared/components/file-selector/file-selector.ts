import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectedFile {
  preview: string;
  file: File;
}

@Component({
  selector: 'app-file-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-selector.html',
  styleUrl: './file-selector.css',
})
export class FileSelector {
  @Input() accept = '.png,.jpg,.jpeg';
  @Input() label = 'Arrastra archivos aquí o';
  @Input() hint = 'PNG, JPG, JPEG';
  /** Color del borde, ícono y texto destacado. Por defecto el verde claro original. */
  @Input() color = '#64BC04';

  @Output() fileSelected = new EventEmitter<SelectedFile>();

  constructor(private el: ElementRef) {}

  onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer?.files) return;
    this.handleFiles(e.dataTransfer.files);
  }

  onFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    this.handleFiles(input.files);
    input.value = '';
  }

  private handleFiles(files: FileList) {
    Array.from(files).forEach((file) => {
      const preview = URL.createObjectURL(file);
      this.fileSelected.emit({ preview, file });
    });
    // Evento DOM que burbujea para que app-base-modal detecte que se soltó/eligió un archivo
    // (el drag&drop no produce un evento `change` nativo).
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }
}
