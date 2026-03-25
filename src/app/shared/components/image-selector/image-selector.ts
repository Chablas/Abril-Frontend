import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectedImage {
  preview: string;
  file: File;
}

@Component({
  selector: 'app-image-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-selector.html',
  styleUrl: './image-selector.css',
})
export class ImageSelector {
  @Output() imageSelected = new EventEmitter<SelectedImage>();

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
      if (!file.type.startsWith('image/')) return;
      const preview = URL.createObjectURL(file);
      this.imageSelected.emit({
        preview,
        file,
      });
    });
  }
}
