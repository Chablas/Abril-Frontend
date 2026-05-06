import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { NavIcon } from '../nav-icon/nav-icon';
import { NavModule, NavGroup, NavItem } from '../../../core/navigation/nav.model';
import { ProgramacionAlertasService } from '../../../core/services/programacion-alertas.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule, NavIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  activeMenu: string | null = null;
  activeGroup: string | null = null;

  constructor(
    private router: Router,
    public navService: NavigationService,
    public alertaSvc: ProgramacionAlertasService,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.alertaSvc.checkRechazados();
    setInterval(() => this.alertaSvc.checkRechazados(), 5 * 60 * 1000);
  }

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

  trackByModuleKey(_: number, module: NavModule): string {
    return module.key;
  }

  trackByGroupLabel(_: number, group: NavGroup): string {
    return group.label;
  }

  trackByItemRoute(_: number, item: NavItem): string {
    return item.route;
  }
}
