import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-modal.html',
  styleUrl: './base-modal.css',
})
export class BaseModal {
  private mousedownOnBackdrop = false;
  @Input() title: string = '';
  @Input() width: string = 'w-[1000px]';
  @Output() closeModal = new EventEmitter();

  onBackdropMousedown() {
    this.mousedownOnBackdrop = true;
  }

  onBackdropClick() {
    if (this.mousedownOnBackdrop) this.closeModal.emit();
    this.mousedownOnBackdrop = false;
  }

  close() {
    this.closeModal.emit();
  }
}
