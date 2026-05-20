import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
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
export class Sidebar implements OnInit, AfterViewInit, OnDestroy {
  activeMenu: string | null = null;
  activeGroup: string | null = null;

  visibleModules: NavModule[] = [];
  overflowModules: NavModule[] = [];
  overflowOpen = false;
  activeOverflowMenu: string | null = null;
  activeOverflowGroup: string | null = null;

  private allModules: NavModule[] = [];
  private moduleHeights: number[] = [];
  private resizeObserver?: ResizeObserver;

  @ViewChildren('moduleItem') moduleItems!: QueryList<ElementRef<HTMLElement>>;

  constructor(
    private router: Router,
    public navService: NavigationService,
    public alertaSvc: ProgramacionAlertasService,
    private elementRef: ElementRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.alertaSvc.checkRechazados();
    setInterval(() => this.alertaSvc.checkRechazados(), 5 * 60 * 1000);
    this.allModules = this.navService.getModules();
    this.visibleModules = [...this.allModules];
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.moduleHeights = this.moduleItems
        .toArray()
        .map((el) => el.nativeElement.getBoundingClientRect().height);
      this.calculateVisibleModules();

      this.resizeObserver = new ResizeObserver(() =>
        this.ngZone.run(() => this.calculateVisibleModules()),
      );
      this.resizeObserver.observe(this.elementRef.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private calculateVisibleModules(): void {
    if (!this.moduleHeights.length) return;

    const hostHeight = this.elementRef.nativeElement.getBoundingClientRect().height;
    const paddingY = 40; // py-[20px] top + bottom
    const gap = 5; // gap-[5px] between items
    const dotsReservation = 63; // dots button (~58px) + one gap (5px)
    const available = hostHeight - paddingY - dotsReservation;

    let used = 0;
    let count = 0;
    for (let i = 0; i < this.moduleHeights.length; i++) {
      const h = this.moduleHeights[i] + (i > 0 ? gap : 0);
      if (used + h <= available) {
        used += h;
        count++;
      } else {
        break;
      }
    }

    this.visibleModules = this.allModules.slice(0, count);
    this.overflowModules = this.allModules.slice(count);

    if (this.overflowModules.length === 0) {
      this.overflowOpen = false;
    }
  }

  isActiveModule(baseRoute: string): boolean {
    if (baseRoute === '/habilitacion') {
      return this.router.url === '/' || this.router.url.startsWith('/habilitacion');
    }
    return this.router.url.startsWith(baseRoute);
  }

  onModuleClick(module: NavModule): void {
    if (module.key === 'habilitacion') {
      this.router.navigate(['/']);
      this.activeMenu = null;
      return;
    }
    this.toggleMenu(module.key);
  }

  toggleMenu(key: string): void {
    this.activeMenu = this.activeMenu === key ? null : key;
    this.activeGroup = null;
  }

  toggleGroup(label: string): void {
    this.activeGroup = this.activeGroup === label ? null : label;
  }

  toggleOverflow(): void {
    this.overflowOpen = !this.overflowOpen;
    if (!this.overflowOpen) {
      this.activeOverflowMenu = null;
      this.activeOverflowGroup = null;
    }
  }

  closeOverflow(): void {
    this.overflowOpen = false;
    this.activeOverflowMenu = null;
    this.activeOverflowGroup = null;
  }

  toggleOverflowMenu(key: string): void {
    this.activeOverflowMenu = this.activeOverflowMenu === key ? null : key;
    this.activeOverflowGroup = null;
  }

  toggleOverflowGroup(label: string): void {
    this.activeOverflowGroup = this.activeOverflowGroup === label ? null : label;
  }

  @HostListener('document:click', ['$event'])
  closeAll(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.activeMenu = null;
      this.activeGroup = null;
      this.overflowOpen = false;
      this.activeOverflowMenu = null;
      this.activeOverflowGroup = null;
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
