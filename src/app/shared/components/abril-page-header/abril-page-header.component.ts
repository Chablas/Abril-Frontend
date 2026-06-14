import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface SsomaHeaderPill {
  icono: string;
  texto: string;
  warn?: boolean;
}

export interface SsomaHeaderBtn {
  label: string;
  icono: string;
}

export interface AbrilPageTab {
  label: string;
  icono: string;
  route: string;
}

@Component({
  selector: 'app-abril-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './abril-page-header.component.html',
  styleUrl: './abril-page-header.component.css',
})
export class AbrilPageHeaderComponent {
  @Input() badge = '';
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() pills: SsomaHeaderPill[] = [];
  @Input() tabs: AbrilPageTab[] = [];
  @Input() botonPrimario?: SsomaHeaderBtn;
  @Input() botonSecundario?: SsomaHeaderBtn;
  @Output() primaryClick = new EventEmitter<void>();
  @Output() secondaryClick = new EventEmitter<void>();
}
