import { Component, Input, Output, EventEmitter, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { AuthService } from '../../../core/services/auth.service';
import { NavIcon } from '../nav-icon/nav-icon';
import { NavModule, NavGroup, NavItem } from '../../../core/navigation/nav.model';
import { MicrosoftAuthService } from '../../../features/auth/pages/login/services/microsoft-auth.service';

@Component({
  selector: 'app-sidebar-mobile',
  standalone: true,
  imports: [RouterModule, CommonModule, NavIcon],
  templateUrl: './sidebar-mobile.html',
  styleUrl: './sidebar-mobile.css',
})
export class SidebarMobile implements OnInit {
  @Input() menuOpen: boolean = false;
  @Output() menuOpenChange = new EventEmitter<boolean>();

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
    private authService: AuthService,
    private microsoftAuthService: MicrosoftAuthService,
  ) {}

  ngOnInit(): void {
    this.allModules = this.navService.getModules();
    if (isPlatformBrowser(this.platformId)) {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userName = user?.displayName ?? null;
      this.userEmail = user?.email ?? null;
      this.userRole = user?.jobTitle ?? null;
      this.userInitials = this.computeInitials(this.userName);
    }
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

  close(): void {
    this.menuOpenChange.emit(false);
  }

  isActiveModule(baseRoute: string): boolean {
    if (baseRoute.startsWith('/habilitacion')) {
      return this.router.url === '/' || this.router.url.startsWith('/habilitacion');
    }
    return this.router.url.startsWith(baseRoute);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  private readonly accordionModuleKeys = new Set(['gestion-ssoma', 'contratistas']);

  hasAccordion(module: NavModule): boolean {
    return this.accordionModuleKeys.has(module.key);
  }

  toggleGroup(label: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedGroup = this.expandedGroup === label ? null : label;
  }

  onModuleClick(module: NavModule): void {
    // Módulos con accordion: toggle in-place, no cierra el drawer
    if (this.accordionModuleKeys.has(module.key)) {
      this.expandedModule = this.expandedModule === module.key ? null : module.key;
      this.expandedGroup = null;
      return;
    }

    // Todos los demás: navegación directa y cierra drawer
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
    this.close();
  }

  navigateAndClose(route: string): void {
    this.router.navigate([route]);
    this.close();
  }

  async logout(): Promise<void> {
    this.close();
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
