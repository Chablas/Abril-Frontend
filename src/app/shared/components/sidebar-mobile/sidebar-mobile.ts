import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { NavModule, NavGroup, NavItem } from '../../../core/navigation/nav.model';

@Component({
  selector: 'app-sidebar-mobile',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar-mobile.html',
  styleUrl: './sidebar-mobile.css',
})
export class SidebarMobile {
  @Input() menuOpen: boolean = false;
  @Output() menuOpenChange = new EventEmitter<boolean>();

  openModule: string | null = null;
  openGroup: string | null = null;

  constructor(public navService: NavigationService, private router: Router) {}

  close(): void {
    this.menuOpenChange.emit(false);
  }

  navigateTo(module: NavModule): void {
    this.router.navigate([module.baseRoute]);
    this.close();
  }

  toggleModule(key: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openModule = this.openModule === key ? null : key;
    this.openGroup = null;
  }

  toggleGroup(label: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openGroup = this.openGroup === label ? null : label;
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
