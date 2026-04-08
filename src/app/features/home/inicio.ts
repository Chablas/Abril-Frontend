import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationService } from '../../core/navigation/navigation.service';
import { NavIcon } from '../../shared/components/nav-icon/nav-icon';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, NavIcon],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  openMenu: string | null = null;

  constructor(public navService: NavigationService) {}

  toggleMenu(key: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenu = this.openMenu === key ? null : key;
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.openMenu = null;
  }
}
