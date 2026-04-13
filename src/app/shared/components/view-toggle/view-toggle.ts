import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ViewToggleMode } from './view-toggle.model';

@Component({
  selector: 'app-view-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-toggle.html',
})
export class ViewToggle {
  @Input() modes: ViewToggleMode[] = [];
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  constructor(private sanitizer: DomSanitizer) {}

  select(value: string): void {
    this.valueChange.emit(value);
  }

  safeIcon(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }
}
