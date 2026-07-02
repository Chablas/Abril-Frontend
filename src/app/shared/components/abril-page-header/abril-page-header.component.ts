import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { NavigationService } from '../../../core/navigation/navigation.service';

export interface SsomaHeaderPill {
  icono: string;
  texto: string;
  warn?: boolean;
}

export interface SsomaHeaderBtn {
  label: string;
  icono: string;
}

export interface AbrilPageTab {
  label: string;
  icono: string;
  route?: string;
  active?: boolean;
  featureKey?: string;
}

export interface AbrilPageTabGroup {
  label: string;
  icono?: string;
  tabs: AbrilPageTab[];
}

@Component({
  selector: 'app-abril-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './abril-page-header.component.html',
  styleUrl: './abril-page-header.component.css',
})
export class AbrilPageHeaderComponent {
  @Input() badge = '';
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() pills: SsomaHeaderPill[] = [];
  @Input() tabs: AbrilPageTab[] = [];
  @Input() tabGroups: AbrilPageTabGroup[] = [];
  @Input() botonPrimario?: SsomaHeaderBtn;
  @Input() botonPrimarioDeshabilitado = false;
  @Input() botonPrimarioTooltip?: string;
  @Input() botonSecundario?: SsomaHeaderBtn;
  @Output() primaryClick = new EventEmitter<void>();
  @Output() secondaryClick = new EventEmitter<void>();
  @Output() menuClick = new EventEmitter<void>();
  @Output() tabClick = new EventEmitter<AbrilPageTab>();

  private layoutService = inject(LayoutService);
  private navigationService = inject(NavigationService);
  private router = inject(Router);

  get hasGroups(): boolean {
    return this.tabGroups.length > 1;
  }

  get activeGroupIndex(): number {
    const url = this.router.url;
    const matchesRoute = (route: string) => url === route || url.startsWith(route + '/');
    const idx = this.tabGroups.findIndex(g =>
      g.tabs.some(t => t.route && matchesRoute(t.route))
    );
    return idx >= 0 ? idx : 0;
  }

  get resolvedTabs(): AbrilPageTab[] {
    return this.hasGroups ? (this.tabGroups[this.activeGroupIndex]?.tabs ?? []) : this.tabs;
  }

  get visibleTabs(): AbrilPageTab[] {
    return this.resolvedTabs.filter(
      (t) => !t.featureKey || this.navigationService.isFeatureAllowed(t.featureKey),
    );
  }

  navigateToGroup(group: AbrilPageTabGroup): void {
    // Navega a la primera pestaña que el usuario realmente puede ver, no a la
    // primera del arreglo a secas — si la primera pestaña (ej. un Dashboard
    // restringido) no le corresponde, lo mandaría a "/" vía roleGuard aunque sí
    // tenga acceso a otras pestañas del mismo grupo (ej. "Evaluar").
    const primeraPermitida = group.tabs.find(
      (t) => t.route && (!t.featureKey || this.navigationService.isFeatureAllowed(t.featureKey)),
    );
    const fallback = group.tabs.find((t) => t.route)?.route;
    const ruta = primeraPermitida?.route ?? fallback;
    if (ruta) this.router.navigateByUrl(ruta);
  }

  onHamburgerClick(): void {
    this.menuClick.emit();
    this.layoutService.openMobileMenu();
  }
}
