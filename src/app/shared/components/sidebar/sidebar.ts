import { Component, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  activeMenu: 'proyectos' | 'seguridad' | null = null;
  configOpen = false;

  constructor(private router: Router) {}

  isActiveModule(module: 'proyectos' | 'seguridad'): boolean {
    return this.router.url.startsWith(`/${module}`);
  }

  toggleMenu(menu: 'proyectos' | 'seguridad', event: MouseEvent) {
    event.stopPropagation();

    if (this.activeMenu === menu) {
      this.activeMenu = null;
      this.configOpen = false;
    } else {
      this.activeMenu = menu;
      this.configOpen = false;
    }
  }

  toggleConfig(event: MouseEvent) {
    event.stopPropagation();
    this.configOpen = !this.configOpen;
  }

  @HostListener('document:click')
  closeAll() {
    this.activeMenu = null;
    this.configOpen = false;
  }

  closeAllMenus() {
    this.activeMenu = null;
    this.configOpen = false;
  }
}