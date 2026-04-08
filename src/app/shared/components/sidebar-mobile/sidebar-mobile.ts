import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { NavIcon } from '../nav-icon/nav-icon';

@Component({
  selector: 'app-sidebar-mobile',
  standalone: true,
  imports: [RouterModule, CommonModule, NavIcon],
  templateUrl: './sidebar-mobile.html',
  styleUrl: './sidebar-mobile.css',
})
export class SidebarMobile {
  @Input() menuOpen: boolean = false;
  @Output() menuOpenChange = new EventEmitter<boolean>();

  openModule: string | null = null;
  openGroup: string | null = null;

  constructor(public navService: NavigationService) {}

  close(): void {
    this.menuOpenChange.emit(false);
  }

  toggleModule(key: string): void {
    this.openModule = this.openModule === key ? null : key;
    this.openGroup = null;
  }

  toggleGroup(label: string): void {
    this.openGroup = this.openGroup === label ? null : label;
  }
}
