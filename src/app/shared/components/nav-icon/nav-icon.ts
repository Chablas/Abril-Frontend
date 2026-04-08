import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav-icon.html',
})
export class NavIcon {
  @Input() key: string = '';
  @Input() size: number = 28;
}
