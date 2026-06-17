import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  route: string;
  /** Si se indica, la pestaña solo se muestra si el usuario tiene acceso a esa feature. */
  featureKey?: string;
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
  @Input() botonPrimario?: SsomaHeaderBtn;
  @Input() botonSecundario?: SsomaHeaderBtn;
  @Output() primaryClick = new EventEmitter<void>();
  @Output() secondaryClick = new EventEmitter<void>();
  @Output() menuClick = new EventEmitter<void>();

  private layoutService = inject(LayoutService);
  private navigationService = inject(NavigationService);

  /** Pestañas visibles: oculta las que tienen featureKey sin acceso del usuario. */
  get visibleTabs(): AbrilPageTab[] {
    return this.tabs.filter(
      (t) => !t.featureKey || this.navigationService.isFeatureAllowed(t.featureKey),
    );
  }

  onHamburgerClick(): void {
    this.menuClick.emit();
    this.layoutService.openMobileMenu();
  }
}
