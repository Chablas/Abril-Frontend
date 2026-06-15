import {
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { AuthService } from '../../../core/services/auth.service';
import { NavIcon } from '../nav-icon/nav-icon';
import { NavModule, NavGroup, NavItem } from '../../../core/navigation/nav.model';
import { ProgramacionAlertasService } from '../../../core/services/programacion-alertas.service';
import { MicrosoftAuthService } from '../../../features/auth/pages/login/services/microsoft-auth.service';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule, NavIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  collapsed = false;
  accountMenuOpen = false;
  expandedModule: string | null = null;
  expandedGroup: string | null = null;
  allModules: NavModule[] = [];
  userName: string | null = null;
  userEmail: string | null = null;
  userInitials = '';
  userRole: string | null = null;

  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    public router: Router,
    public navService: NavigationService,
    public alertaSvc: ProgramacionAlertasService,
    private authService: AuthService,
    private microsoftAuthService: MicrosoftAuthService,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.alertaSvc.checkRechazados();
    setInterval(() => this.alertaSvc.checkRechazados(), 5 * 60 * 1000);
    this.allModules = this.navService.getModules();
    if (isPlatformBrowser(this.platformId)) {
      this.collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userName = user?.displayName ?? null;
      this.userEmail = user?.email ?? null;
      this.userRole = user?.jobTitle ?? null;
      this.userInitials = this.computeInitials(this.userName);
    }
  }

  ngOnDestroy(): void {}

  @HostBinding('class.collapsed')
  get isCollapsed(): boolean {
    return this.collapsed;
  }

  get mainModules(): NavModule[] {
    return this.allModules.filter((m) => m.key !== 'configuracion');
  }

  get configModule(): NavModule | undefined {
    return this.allModules.find((m) => m.key === 'configuracion');
  }

  private computeInitials(name: string | null): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    this.expandedModule = null;
    this.expandedGroup = null;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(this.collapsed));
    }
  }

  toggleAccountMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  toggleSidebarGroup(label: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedGroup = this.expandedGroup === label ? null : label;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.accountMenuOpen = false;
    }
  }

  isActiveModule(baseRoute: string): boolean {
    const url = this.router.url;
    if (baseRoute === '/habilitacion/gestion') {
      return url.startsWith('/habilitacion/gestion') ||
             url.startsWith('/habilitacion/dashboard-contratista');
    }
    if (baseRoute === '/ssoma') {
      return (url === '/ssoma' || url.startsWith('/ssoma/')) &&
             !url.startsWith('/ssoma/gestion');
    }
    return url === baseRoute || url.startsWith(baseRoute + '/');
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  private readonly accordionModuleKeys = new Set(['gestion-ssoma', 'contratistas', 'costos']);

  hasAccordion(module: NavModule): boolean {
    return this.accordionModuleKeys.has(module.key);
  }

  onModuleClick(module: NavModule): void {
    this.accountMenuOpen = false;

    // Módulos con accordion: toggle in-place (desktop expandido)
    if (!this.collapsed && this.accordionModuleKeys.has(module.key)) {
      this.expandedModule = this.expandedModule === module.key ? null : module.key;
      this.expandedGroup = null;
      return;
    }

    // Todos los demás: navegación directa
    if (module.key === 'habilitacion') {
      this.router.navigate([
        this.authService.isContratista()
          ? '/habilitacion/dashboard-contratista'
          : '/habilitacion/gestion',
      ]);
    } else {
      const directRoutes: Record<string, string> = {
        'control-acceso': '/habilitacion/control-acceso',
        clinica: '/clinica/dashboard',
        'mejora-continua': '/mejora-continua/dashboard',
        'gestion-administrativa': '/gestion-administrativa/solicitud-salidas',
        proyectos: '/projects/projects-dashboard',
        ssoma: '/ssoma/salud-ocupacional/dashboard',
        'gestion-ssoma': '/ssoma/gestion/paso/dashboard',
        'arquitectura-comercial': '/arquitectura-comercial/dashboard',
        evaluaciones: '/evaluaciones/dashboard',
        seguridad: '/security/users',
        configuracion: '/configuracion/proyectos',
        costos: '/costs/adjudicaciones',
        contratistas: '/contractors/management',
      };
      const route = directRoutes[module.key];
      if (route) {
        this.router.navigate([route]);
      } else {
        const items = this.navService.filterItems(module.items);
        if (items.length > 0) this.router.navigate([items[0].route]);
      }
    }
    this.expandedModule = null;
  }

  async logout(): Promise<void> {
    await this.microsoftAuthService.logout();
    this.router.navigate(['/auth/login']);
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
