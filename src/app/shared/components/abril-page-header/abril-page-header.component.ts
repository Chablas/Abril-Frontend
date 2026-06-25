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
  route?: string;
  active?: boolean;
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
  /** Deshabilita el botón primario (no emite primaryClick y se ve atenuado). */
  @Input() botonPrimarioDeshabilitado = false;
  /** Tooltip a mostrar sobre el botón primario (útil al estar deshabilitado). */
  @Input() botonPrimarioTooltip?: string;
  @Input() botonSecundario?: SsomaHeaderBtn;
  @Output() primaryClick = new EventEmitter<void>();
  @Output() secondaryClick = new EventEmitter<void>();
  @Output() menuClick = new EventEmitter<void>();
  @Output() tabClick = new EventEmitter<AbrilPageTab>();

  private layoutService = inject(LayoutService);
  private navigationService = inject(NavigationService);

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
