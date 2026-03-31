import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FilePreviewItem {
  name: string;
  size: string;
}

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-preview.html',
})
export class FilePreview {

  @Input() files: FilePreviewItem[] = [];

  @Output() remove = new EventEmitter<number>();

  removeFile(index: number) {
    this.remove.emit(index);
  }

}
