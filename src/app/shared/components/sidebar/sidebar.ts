import { Component, ElementRef, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { NavIcon } from '../nav-icon/nav-icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule, NavIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  activeMenu: string | null = null;
  activeGroup: string | null = null;

  constructor(
    private router: Router,
    public navService: NavigationService,
    private elementRef: ElementRef,
  ) {}

  isActiveModule(baseRoute: string): boolean {
    return this.router.url.startsWith(baseRoute);
  }

  toggleMenu(key: string): void {
    this.activeMenu = this.activeMenu === key ? null : key;
    this.activeGroup = null;
  }

  toggleGroup(label: string): void {
    this.activeGroup = this.activeGroup === label ? null : label;
  }

  @HostListener('document:click', ['$event'])
  closeAll(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.activeMenu = null;
      this.activeGroup = null;
    }
  }

  closeAllMenus(): void {
    this.activeMenu = null;
    this.activeGroup = null;
  }
}
