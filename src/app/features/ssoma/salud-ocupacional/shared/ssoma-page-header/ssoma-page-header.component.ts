import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SsomaHeaderPill {
  icono: string;
  texto: string;
  warn?: boolean;
}

export interface SsomaHeaderBtn {
  label: string;
  icono: string;
}

@Component({
  selector: 'app-ssoma-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ssoma-page-header.component.html',
  styleUrl: './ssoma-page-header.component.css',
})
export class SsomaPageHeaderComponent {
  @Input() badge = 'SSOMA';
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() pills: SsomaHeaderPill[] = [];
  @Input() botonPrimario?: SsomaHeaderBtn;
  @Input() botonSecundario?: SsomaHeaderBtn;
  @Output() primaryClick = new EventEmitter<void>();
  @Output() secondaryClick = new EventEmitter<void>();
}
