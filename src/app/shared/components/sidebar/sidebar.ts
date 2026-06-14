import {
  AfterViewInit,
  ChangeDetectorRef,
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
import { AuthService } from '../../../core/services/auth.service';
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
  isReady = false;
  activeOverflowMenu: string | null = null;
  activeOverflowGroup: string | null = null;

  private allModules: NavModule[] = [];
  private moduleHeights: number[] = [];
  private resizeObserver?: ResizeObserver;
  private resizeRafId = 0;

  @ViewChildren('moduleItem') moduleItems!: QueryList<ElementRef<HTMLElement>>;

  constructor(
    private router: Router,
    public navService: NavigationService,
    public alertaSvc: ProgramacionAlertasService,
    private elementRef: ElementRef,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
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
      this.isReady = true;
      this.cdr.detectChanges();

      this.resizeObserver = new ResizeObserver(() =>
        this.ngZone.run(() => this.calculateVisibleModules()),
      );
      this.resizeObserver.observe(this.elementRef.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.resizeRafId) cancelAnimationFrame(this.resizeRafId);
  }

  /**
   * Recalcula los módulos visibles cuando cambia el viewport (cambio de pestaña,
   * modo responsive de devtools, redimensionar la ventana). El ResizeObserver del
   * host no siempre dispara en estos casos (p. ej. cuando el sidebar estaba oculto),
   * así que escuchamos también window:resize. Se coalesce con rAF para no recalcular
   * en cada evento; calculateVisibleModules fuerza change detection.
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeRafId) cancelAnimationFrame(this.resizeRafId);
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = 0;
      this.calculateVisibleModules();
    });
  }

  private calculateVisibleModules(): void {
    if (!this.moduleHeights.length) return;

    const hostHeight = this.elementRef.nativeElement.getBoundingClientRect().height;
    if (hostHeight <= 0) return; // sidebar oculto (móvil): no recalcular ni borrar la lista
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

    // Forzar refresco: el recálculo viene de callbacks async (ResizeObserver /
    // window:resize) donde la change detection no corre sola; sin esto el cambio
    // solo se reflejaba tras un click.
    this.cdr.detectChanges();
  }

  isActiveModule(baseRoute: string): boolean {
    if (baseRoute === '/habilitacion') {
      return this.router.url === '/' || this.router.url.startsWith('/habilitacion');
    }
    return this.router.url.startsWith(baseRoute);
  }

  onModuleClick(module: NavModule): void {
    if (module.key === 'habilitacion') {
      if (this.authService.isContratista()) {
        this.router.navigate(['/habilitacion/dashboard-contratista']);
      } else {
        this.router.navigate(['/habilitacion/gestion']);
      }
      this.activeMenu = null;
      return;
    }
    if (module.key === 'control-acceso') {
      this.router.navigate(['/habilitacion/control-acceso']);
      this.activeMenu = null;
      return;
    }
    if (module.key === 'clinica') {
      this.router.navigate(['/clinica/dashboard']);
      this.activeMenu = null;
      return;
    }
    if (module.key === 'mejora-continua') {
      this.router.navigate(['/mejora-continua/dashboard']);
      this.activeMenu = null;
      return;
    }
    if (module.key === 'gestion-administrativa') {
      this.router.navigate(['/gestion-administrativa/solicitud-salidas']);
      this.activeMenu = null;
      return;
    }
    if (module.key === 'proyectos') {
      this.router.navigate(['/projects/projects-dashboard']);
      this.activeMenu = null;
      return;
    }
    if (module.key === 'arquitectura-comercial') {
      this.router.navigate(['/arquitectura-comercial/dashboard']);
      this.activeMenu = null;
      return;
    }
    if (module.key === 'evaluaciones') {
      this.router.navigate(['/evaluaciones/dashboard']);
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
